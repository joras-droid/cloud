import "server-only";
import { and, desc, eq, gte, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { phoneLookupKeys } from "@/lib/phone";

/** An order leaves this page once it is delivered, or 24 hours after it was placed. */
export const TRACK_WINDOW_MS = 24 * 60 * 60 * 1000;

type Status = (typeof s.orderStatus.enumValues)[number];

export type TrackedOrder = {
  orderCode: string;
  status: Status;
  paymentMethod: (typeof s.paymentMethod.enumValues)[number];
  placedAt: Date;
  addressLine: string;
  landmark: string | null;
  deliveryAfterHours: number;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  zoneNameEn: string;
  zoneNameNe: string | null;
  phone: string;
  cancelledReason: string | null;
  items: {
    id: string;
    nameEn: string;
    nameNe: string | null;
    qty: number;
    lineTotal: number;
    variant: { labelEn?: string; labelNe?: string } | null;
    modifiers: { nameEn: string; nameNe?: string | null }[];
  }[];
  rider: { name: string | null; phone: string | null } | null;
};

/**
 * Orders this phone may see right now: placed within the last 24 hours and
 * not yet delivered. Delivered and older orders are omitted on purpose, and
 * a miss looks the same as an unknown number.
 */
export async function getTrackableOrders(phone: string): Promise<TrackedOrder[]> {
  const since = new Date(Date.now() - TRACK_WINDOW_MS);

  const rows = await db
    .select({
      order: s.orders,
      phone: s.customers.phone,
      zoneEn: s.deliveryZones.nameEn,
      zoneNe: s.deliveryZones.nameNe,
    })
    .from(s.orders)
    .innerJoin(s.customers, eq(s.orders.customerId, s.customers.id))
    .innerJoin(s.deliveryZones, eq(s.orders.zoneId, s.deliveryZones.id))
    .where(
      and(
        inArray(s.customers.phone, phoneLookupKeys(phone)),
        ne(s.orders.status, "delivered"),
        gte(s.orders.placedAt, since),
      ),
    )
    .orderBy(desc(s.orders.placedAt));

  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.order.id);
  const [items, deliveries] = await Promise.all([
    db.select().from(s.orderItems).where(inArray(s.orderItems.orderId, ids)),
    db.select().from(s.deliveries).where(inArray(s.deliveries.orderId, ids)),
  ]);

  const riderByOrder = new Map<string, { name: string | null; phone: string | null }>();
  for (const delivery of deliveries) {
    riderByOrder.set(delivery.orderId, {
      name: delivery.riderName,
      phone: delivery.riderPhone,
    });
  }

  return rows.map((row) => ({
    orderCode: row.order.orderCode,
    status: row.order.status,
    paymentMethod: row.order.paymentMethod,
    placedAt: row.order.placedAt,
    addressLine: row.order.addressLine,
    landmark: row.order.landmark,
    deliveryAfterHours: row.order.deliveryAfterHours,
    subtotal: row.order.subtotal,
    deliveryFee: row.order.deliveryFee,
    discount: row.order.discount,
    total: row.order.total,
    zoneNameEn: row.zoneEn,
    zoneNameNe: row.zoneNe,
    phone: row.phone,
    cancelledReason: row.order.cancelledReason,
    items: items
      .filter((item) => item.orderId === row.order.id)
      .map((item) => ({
        id: item.id,
        nameEn: item.nameEnSnapshot,
        nameNe: item.nameNeSnapshot,
        qty: item.qty,
        lineTotal: item.lineTotal,
        variant:
          (item.variantSnapshot as { labelEn?: string; labelNe?: string } | null) ??
          null,
        modifiers:
          (item.modifiersSnapshot as
            | { nameEn: string; nameNe?: string | null }[]
            | null) ?? [],
      })),
    rider: riderByOrder.get(row.order.id) ?? null,
  }));
}

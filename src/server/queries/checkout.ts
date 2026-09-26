import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { CHECKOUT_CITY_NAMES } from "@/lib/checkout/cities";

export type CheckoutCity = {
  id: string;
  nameEn: string;
  nameNe: string | null;
  fee: number;
  codAllowed: boolean;
};

const CITY_DEFAULTS: {
  nameEn: (typeof CHECKOUT_CITY_NAMES)[number];
  nameNe: string;
  fee: number;
  sortOrder: number;
}[] = [
  { nameEn: "Kathmandu", nameNe: "काठमाडौं", fee: 8000, sortOrder: 0 },
  { nameEn: "Lalitpur", nameNe: "ललितपुर", fee: 15000, sortOrder: 1 },
];

export async function getCheckoutCities(): Promise<CheckoutCity[]> {
  const existing = await db
    .select()
    .from(s.deliveryZones)
    .where(inArray(s.deliveryZones.nameEn, [...CHECKOUT_CITY_NAMES]));

  const byName = new Map(existing.map((z) => [z.nameEn, z]));
  const cities: CheckoutCity[] = [];

  for (const city of CITY_DEFAULTS) {
    const row = byName.get(city.nameEn);
    if (row) {
      if (!row.isActive) {
        await db
          .update(s.deliveryZones)
          .set({ isActive: true, sortOrder: city.sortOrder })
          .where(eq(s.deliveryZones.id, row.id));
      }
      cities.push({
        id: row.id,
        nameEn: row.nameEn,
        nameNe: row.nameNe,
        fee: row.fee,
        codAllowed: row.codAllowed,
      });
    } else {
      const [created] = await db
        .insert(s.deliveryZones)
        .values({
          nameEn: city.nameEn,
          nameNe: city.nameNe,
          fee: city.fee,
          codAllowed: true,
          isActive: true,
          sortOrder: city.sortOrder,
        })
        .returning();
      cities.push({
        id: created.id,
        nameEn: created.nameEn,
        nameNe: created.nameNe,
        fee: created.fee,
        codAllowed: created.codAllowed,
      });
    }
  }

  return cities;
}

export async function getOrderByCode(code: string) {
  const [row] = await db
    .select({
      order: s.orders,
      phone: s.customers.phone,
      zoneEn: s.deliveryZones.nameEn,
      zoneNe: s.deliveryZones.nameNe,
    })
    .from(s.orders)
    .innerJoin(s.customers, eq(s.orders.customerId, s.customers.id))
    .innerJoin(s.deliveryZones, eq(s.orders.zoneId, s.deliveryZones.id))
    .where(eq(s.orders.orderCode, code))
    .limit(1);
  if (!row) return null;

  const items = await db
    .select()
    .from(s.orderItems)
    .where(eq(s.orderItems.orderId, row.order.id));

  return {
    id: row.order.id,
    orderCode: row.order.orderCode,
    status: row.order.status,
    paymentMethod: row.order.paymentMethod,
    addressLine: row.order.addressLine,
    mapUrl: row.order.mapUrl,
    callRequested: row.order.callRequested,
    locale: row.order.locale,
    subtotal: row.order.subtotal,
    deliveryFee: row.order.deliveryFee,
    total: row.order.total,
    expiresAt: row.order.expiresAt,
    phone: row.phone,
    zoneEn: row.zoneEn,
    zoneNe: row.zoneNe,
    items: items.map((i) => ({
      id: i.id,
      nameEn: i.nameEnSnapshot,
      nameNe: i.nameNeSnapshot,
      qty: i.qty,
      lineTotal: i.lineTotal,
    })),
  };
}


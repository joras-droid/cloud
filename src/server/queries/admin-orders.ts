import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { mediaUrl } from "@/lib/media";

export type AdminOrderDetail = {
  id: string;
  orderCode: string;
  status: (typeof s.orderStatus.enumValues)[number];
  paymentMethod: (typeof s.paymentMethod.enumValues)[number];
  addressLine: string;
  landmark: string | null;
  mapUrl: string | null;
  callRequested: boolean;
  deliveryAfterHours: number;
  notes: string | null;
  locale: "en" | "ne";
  subtotal: number;
  deliveryFee: number;
  total: number;
  placedAt: Date;
  customer: { name: string; phone: string };
  zone: { nameEn: string; nameNe: string | null };
  items: {
    id: string;
    nameEn: string;
    nameNe: string | null;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    variant: { labelEn?: string; labelNe?: string } | null;
    modifiers: { nameEn: string; nameNe?: string | null }[];
  }[];
  payment: {
    id: string;
    method: (typeof s.paymentMethod.enumValues)[number];
    amount: number;
    status: (typeof s.paymentStatus.enumValues)[number];
    payerName: string | null;
    payerPhone: string | null;
    rejectReason: (typeof s.paymentRejectReason.enumValues)[number] | null;
    screenshotUrl: string | null;
  } | null;
  delivery: {
    riderName: string | null;
    riderPhone: string | null;
    yangoRef: string | null;
    dispatchedAt: Date | null;
  } | null;
  events: {
    id: string;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: Date;
  }[];
};

export async function getAdminOrder(
  id: string,
): Promise<AdminOrderDetail | null> {
  const [row] = await db
    .select({
      order: s.orders,
      customerName: s.customers.name,
      customerPhone: s.customers.phone,
      zoneEn: s.deliveryZones.nameEn,
      zoneNe: s.deliveryZones.nameNe,
    })
    .from(s.orders)
    .innerJoin(s.customers, eq(s.orders.customerId, s.customers.id))
    .innerJoin(s.deliveryZones, eq(s.orders.zoneId, s.deliveryZones.id))
    .where(eq(s.orders.id, id))
    .limit(1);

  if (!row) return null;

  const items = await db
    .select()
    .from(s.orderItems)
    .where(eq(s.orderItems.orderId, id));

  const [payment] = await db
    .select({
      payment: s.payments,
      shotKey: s.media.r2Key,
    })
    .from(s.payments)
    .leftJoin(s.media, eq(s.payments.screenshotMediaId, s.media.id))
    .where(eq(s.payments.orderId, id))
    .limit(1);

  const [delivery] = await db
    .select()
    .from(s.deliveries)
    .where(eq(s.deliveries.orderId, id))
    .limit(1);

  const events = await db
    .select()
    .from(s.orderEvents)
    .where(eq(s.orderEvents.orderId, id))
    .orderBy(desc(s.orderEvents.createdAt));

  return {
    id: row.order.id,
    orderCode: row.order.orderCode,
    status: row.order.status,
    paymentMethod: row.order.paymentMethod,
    addressLine: row.order.addressLine,
    landmark: row.order.landmark,
    mapUrl: row.order.mapUrl,
    callRequested: row.order.callRequested,
    deliveryAfterHours: row.order.deliveryAfterHours,
    notes: row.order.notes,
    locale: row.order.locale,
    subtotal: row.order.subtotal,
    deliveryFee: row.order.deliveryFee,
    total: row.order.total,
    placedAt: row.order.placedAt,
    customer: { name: row.customerName, phone: row.customerPhone },
    zone: { nameEn: row.zoneEn, nameNe: row.zoneNe },
    items: items.map((i) => ({
      id: i.id,
      nameEn: i.nameEnSnapshot,
      nameNe: i.nameNeSnapshot,
      qty: i.qty,
      unitPrice: i.unitPriceSnapshot,
      lineTotal: i.lineTotal,
      variant: (i.variantSnapshot as { labelEn?: string; labelNe?: string } | null) ??
        null,
      modifiers:
        (i.modifiersSnapshot as { nameEn: string; nameNe?: string | null }[] | null) ??
        [],
    })),
    payment: payment
      ? {
          id: payment.payment.id,
          method: payment.payment.method,
          amount: payment.payment.amount,
          status: payment.payment.status,
          payerName: payment.payment.payerName,
          payerPhone: payment.payment.payerPhone,
          rejectReason: payment.payment.rejectReason,
          screenshotUrl: mediaUrl(payment.shotKey),
        }
      : null,
    delivery: delivery
      ? {
          riderName: delivery.riderName,
          riderPhone: delivery.riderPhone,
          yangoRef: delivery.yangoRef,
          dispatchedAt: delivery.dispatchedAt,
        }
      : null,
    events: events.map((e) => ({
      id: e.id,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      note: e.note,
      createdAt: e.createdAt,
    })),
  };
}

export async function getAdminReviews() {
  return db
    .select({
      id: s.reviews.id,
      rating: s.reviews.rating,
      body: s.reviews.body,
      status: s.reviews.status,
      createdAt: s.reviews.createdAt,
      authorName: s.reviews.authorName,
      customerName: s.customers.name,
      orderCode: s.orders.orderCode,
      itemName: s.menuItems.nameEn,
      replyEn: s.reviewReplies.bodyEn,
      replyNe: s.reviewReplies.bodyNe,
    })
    .from(s.reviews)
    .leftJoin(s.customers, eq(s.reviews.customerId, s.customers.id))
    .leftJoin(s.orders, eq(s.reviews.orderId, s.orders.id))
    .leftJoin(s.menuItems, eq(s.reviews.itemId, s.menuItems.id))
    .leftJoin(s.reviewReplies, eq(s.reviewReplies.reviewId, s.reviews.id))
    .orderBy(asc(s.reviews.status), desc(s.reviews.createdAt));
}

export async function getAdminSections() {
  const rows = await db
    .select()
    .from(s.sections)
    .orderBy(asc(s.sections.pageScope), asc(s.sections.sortOrder));

  const blocks = await db
    .select()
    .from(s.blocks)
    .orderBy(asc(s.blocks.sortOrder));

  return rows.map((row) => ({
    ...row,
    blocks: blocks.filter((b) => b.sectionId === row.id),
  }));
}

export async function getAdminSection(id: string) {
  const [row] = await db
    .select()
    .from(s.sections)
    .where(eq(s.sections.id, id))
    .limit(1);
  if (!row) return null;

  const blocks = await db
    .select()
    .from(s.blocks)
    .where(eq(s.blocks.sectionId, id))
    .orderBy(asc(s.blocks.sortOrder));

  return { ...row, blocks };
}

export async function getAdminSettingsRow() {
  const [row] = await db.select().from(s.storeSettings).limit(1);
  return row ?? null;
}

export async function getAdminZones() {
  return db
    .select()
    .from(s.deliveryZones)
    .orderBy(asc(s.deliveryZones.sortOrder));
}

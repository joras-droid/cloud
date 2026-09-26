import "server-only";
import { and, asc, count, desc, eq, gte, inArray, ne, or, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { deliveredBoardVisibleSince } from "@/lib/admin/order-board-window";
import { mediaUrl } from "@/lib/media";

/** Statuses that need a human to do something. Drives the sidebar badges. */
const ACTIONABLE: (typeof s.orderStatus.enumValues)[number][] = [
  "payment_submitted",
  "pending_confirmation",
  "confirmed",
  "preparing",
  "ready",
];

export async function getAdminBadges() {
  const [orders] = await db
    .select({ n: count() })
    .from(s.orders)
    .where(inArray(s.orders.status, ACTIONABLE));

  const [reviews] = await db
    .select({ n: count() })
    .from(s.reviews)
    .where(eq(s.reviews.status, "pending"));

  return {
    actionableOrders: orders?.n ?? 0,
    pendingReviews: reviews?.n ?? 0,
  };
}

function startOfKathmanduToday(): Date {
  // Nepal is UTC+05:45, so "today" cannot be derived from the server clock.
  const now = new Date();
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
  }).format(now);
  return new Date(`${ymd}T00:00:00+05:45`);
}

export async function getDashboardStats() {
  const since = startOfKathmanduToday();

  // Revenue counts verified orders only. A `pending_payment` row is not money.
  const [today] = await db
    .select({ orders: count(), revenue: sum(s.orders.total) })
    .from(s.orders)
    .where(
      and(
        gte(s.orders.placedAt, since),
        inArray(s.orders.status, [
          "confirmed",
          "preparing",
          "ready",
          "out_for_delivery",
          "delivered",
        ]),
      ),
    );

  const [awaitingPayment] = await db
    .select({ n: count() })
    .from(s.orders)
    .where(eq(s.orders.status, "payment_submitted"));

  const [awaitingConfirm] = await db
    .select({ n: count() })
    .from(s.orders)
    .where(eq(s.orders.status, "pending_confirmation"));

  const [pendingReviews] = await db
    .select({ n: count() })
    .from(s.reviews)
    .where(eq(s.reviews.status, "pending"));

  const [soldOut] = await db
    .select({ n: count() })
    .from(s.menuItems)
    .where(eq(s.menuItems.status, "sold_out"));

  return {
    todayOrders: today?.orders ?? 0,
    todayRevenue: Number(today?.revenue ?? 0),
    awaitingPayment: awaitingPayment?.n ?? 0,
    awaitingConfirm: awaitingConfirm?.n ?? 0,
    pendingReviews: pendingReviews?.n ?? 0,
    soldOutItems: soldOut?.n ?? 0,
  };
}

export type BoardOrderItem = {
  nameEn: string;
  qty: number;
  lineTotal: number;
};

export type AdminOrderRow = {
  id: string;
  orderCode: string;
  status: (typeof s.orderStatus.enumValues)[number];
  paymentMethod: (typeof s.paymentMethod.enumValues)[number];
  total: number;
  customerName: string;
  customerPhone: string;
  addressLine: string;
  zone: string;
  placedAt: Date;
  deliveryAfterHours: number;
  itemCount: number;
  items: BoardOrderItem[];
};

export async function getOrderBoard(): Promise<AdminOrderRow[]> {
  const deliveredSince = deliveredBoardVisibleSince().toISOString();

  const rows = await db
    .select({
      id: s.orders.id,
      orderCode: s.orders.orderCode,
      status: s.orders.status,
      paymentMethod: s.orders.paymentMethod,
      total: s.orders.total,
      customerName: s.customers.name,
      customerPhone: s.customers.phone,
      addressLine: s.orders.addressLine,
      zone: s.deliveryZones.nameEn,
      placedAt: s.orders.placedAt,
      deliveryAfterHours: s.orders.deliveryAfterHours,
      itemCount: sql<number>`(
        select coalesce(sum(${s.orderItems.qty}), 0)
        from ${s.orderItems}
        where ${s.orderItems.orderId} = ${s.orders.id}
      )`,
    })
    .from(s.orders)
    .innerJoin(s.customers, eq(s.orders.customerId, s.customers.id))
    .innerJoin(s.deliveryZones, eq(s.orders.zoneId, s.deliveryZones.id))
    .leftJoin(s.deliveries, eq(s.deliveries.orderId, s.orders.id))
    .where(
      and(
        ne(s.orders.status, "cancelled"),
        or(
          ne(s.orders.status, "delivered"),
          sql`coalesce(
            ${s.deliveries.deliveredAt},
            (
              select max(${s.orderEvents.createdAt})
              from ${s.orderEvents}
              where ${s.orderEvents.orderId} = ${s.orders.id}
                and ${s.orderEvents.toStatus} = 'delivered'
            ),
            ${s.orders.placedAt}
          ) >= ${deliveredSince}::timestamptz`,
        ),
      ),
    )
    .orderBy(asc(s.orders.placedAt))
    .limit(200);

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const itemRows = await db
    .select({
      orderId: s.orderItems.orderId,
      nameEn: s.orderItems.nameEnSnapshot,
      qty: s.orderItems.qty,
      lineTotal: s.orderItems.lineTotal,
    })
    .from(s.orderItems)
    .where(inArray(s.orderItems.orderId, ids));

  const itemsByOrder = new Map<string, BoardOrderItem[]>();
  for (const item of itemRows) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push({
      nameEn: item.nameEn,
      qty: item.qty,
      lineTotal: item.lineTotal,
    });
    itemsByOrder.set(item.orderId, list);
  }

  return rows.map((r) => ({
    ...r,
    itemCount: Number(r.itemCount),
    items: itemsByOrder.get(r.id) ?? [],
  }));
}

export type AdminMenuRow = {
  id: string;
  slug: string;
  nameEn: string;
  nameNe: string | null;
  categoryEn: string;
  basePrice: number;
  status: (typeof s.menuItemStatus.enumValues)[number];
  image: string | null;
  imageKind: "image" | "video" | null;
  sortOrder: number;
};

export async function getAdminMenu(): Promise<AdminMenuRow[]> {
  const rows = await db
    .select({
      id: s.menuItems.id,
      slug: s.menuItems.slug,
      nameEn: s.menuItems.nameEn,
      nameNe: s.menuItems.nameNe,
      categoryEn: s.categories.nameEn,
      categorySort: s.categories.sortOrder,
      basePrice: s.menuItems.basePrice,
      status: s.menuItems.status,
      heroKey: s.media.r2Key,
      heroKind: s.media.kind,
      sortOrder: s.menuItems.sortOrder,
    })
    .from(s.menuItems)
    .innerJoin(s.categories, eq(s.menuItems.categoryId, s.categories.id))
    .leftJoin(s.media, eq(s.menuItems.heroMediaId, s.media.id))
    .where(sql`${s.menuItems.deletedAt} is null`)
    .orderBy(s.categories.sortOrder, s.menuItems.sortOrder);

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    nameEn: r.nameEn,
    nameNe: r.nameNe,
    categoryEn: r.categoryEn,
    basePrice: r.basePrice,
    status: r.status,
    image: mediaUrl(r.heroKey),
    imageKind: r.heroKind,
    sortOrder: r.sortOrder,
  }));
}

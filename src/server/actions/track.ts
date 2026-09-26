"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import * as s from "@/db/schema";
import { canCustomerCancel, CUSTOMER_CANCEL_REASON } from "@/lib/order-cancel";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizeNepalPhone, phoneLookupKeys } from "@/lib/phone";
import { createTrackSession, destroyTrackSession, getTrackPhone } from "@/lib/track/session";
import { publishOrders } from "@/server/cache";
import { text } from "@/server/form";
import { getTrackableOrders } from "@/server/queries/track-order";

export type TrackError = "invalid_phone" | "not_found" | "rate_limited";
export type TrackState = { error?: TrackError };

/**
 * The track page has no account. The phone used at checkout is the only
 * credential, and it only opens orders that are still undelivered and inside
 * the 24-hour window.
 */
export async function lookupOrder(
  _prev: TrackState,
  formData: FormData,
): Promise<TrackState> {
  const raw = String(formData.get("phone") ?? "");
  const digits = raw.replace(/\D/g, "").slice(0, 15) || "empty";
  const limit = await checkRateLimit(`track:${digits}`, 8, 300);
  if (!limit.ok) return { error: "rate_limited" };

  const phone = normalizeNepalPhone(raw);
  if (!phone) return { error: "invalid_phone" };

  const orders = await getTrackableOrders(phone);
  if (orders.length === 0) return { error: "not_found" };

  await createTrackSession(phone);
  return {};
}

export type CancelState = { error?: "too_late" | "unavailable"; ok?: boolean };

/** The signed-in track phone may cancel its own order during the first 3 minutes. */
export async function cancelOwnOrder(
  _prev: CancelState,
  formData: FormData,
): Promise<CancelState> {
  const sessionPhone = await getTrackPhone();
  const code = text(formData, "orderCode").toUpperCase();
  if (!sessionPhone || !code) return { error: "unavailable" };

  const [row] = await db
    .select({
      id: s.orders.id,
      status: s.orders.status,
      placedAt: s.orders.placedAt,
      phone: s.customers.phone,
    })
    .from(s.orders)
    .innerJoin(s.customers, eq(s.orders.customerId, s.customers.id))
    .where(eq(s.orders.orderCode, code))
    .limit(1);

  if (!row || !phoneLookupKeys(sessionPhone).includes(row.phone)) {
    return { error: "unavailable" };
  }
  if (!canCustomerCancel(row.placedAt, row.status)) {
    return { error: "too_late" };
  }

  await db
    .update(s.orders)
    .set({ status: "cancelled", cancelledReason: CUSTOMER_CANCEL_REASON })
    .where(eq(s.orders.id, row.id));
  await db.insert(s.orderEvents).values({
    orderId: row.id,
    fromStatus: row.status,
    toStatus: "cancelled",
    note: "Cancelled by customer",
  });
  await publishOrders();
  return { ok: true };
}

export type DeliveredState = { error?: "not_on_the_way" | "unavailable"; ok?: boolean };

/** The customer can confirm delivery only after the order is on the way. */
export async function markOwnDelivered(
  _prev: DeliveredState,
  formData: FormData,
): Promise<DeliveredState> {
  const sessionPhone = await getTrackPhone();
  const code = text(formData, "orderCode").toUpperCase();
  if (!sessionPhone || !code) return { error: "unavailable" };

  const [row] = await db
    .select({
      id: s.orders.id,
      status: s.orders.status,
      paymentMethod: s.orders.paymentMethod,
      phone: s.customers.phone,
    })
    .from(s.orders)
    .innerJoin(s.customers, eq(s.orders.customerId, s.customers.id))
    .where(eq(s.orders.orderCode, code))
    .limit(1);

  if (!row || !phoneLookupKeys(sessionPhone).includes(row.phone)) {
    return { error: "unavailable" };
  }
  if (row.status !== "out_for_delivery") return { error: "not_on_the_way" };

  await db
    .update(s.orders)
    .set({ status: "delivered" })
    .where(eq(s.orders.id, row.id));
  await db
    .update(s.deliveries)
    .set({ deliveredAt: new Date() })
    .where(eq(s.deliveries.orderId, row.id));
  if (row.paymentMethod === "cod") {
    await db
      .update(s.payments)
      .set({ status: "collected", verifiedAt: new Date() })
      .where(eq(s.payments.orderId, row.id));
  }
  await db.insert(s.orderEvents).values({
    orderId: row.id,
    fromStatus: row.status,
    toStatus: "delivered",
    note: "Customer confirmed delivery",
  });
  await publishOrders();
  return { ok: true };
}

export async function clearTrack(formData: FormData) {
  await destroyTrackSession();
  const locale = formData.get("locale") === "ne" ? "ne" : "en";
  redirect(locale === "ne" ? "/ne/track" : "/track");
}

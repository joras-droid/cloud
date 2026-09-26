"use server";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { normalizeNepalPhone, phoneLookupKeys } from "@/lib/phone";
import { writeAudit } from "@/server/audit";
import { publishOrders } from "@/server/cache";
import { optional, text } from "@/server/form";

export type RiderFormState = { ok?: true; at?: number; error?: string };

type Status = (typeof s.orderStatus.enumValues)[number];

const STATUSES = new Set<string>(s.orderStatus.enumValues);

function asStatus(value: string): Status {
  if (!STATUSES.has(value)) throw new Error("Invalid status");
  return value as Status;
}

async function transition(
  orderId: string,
  to: Status,
  actorId: string,
  note?: string | null,
) {
  const [order] = await db
    .select()
    .from(s.orders)
    .where(eq(s.orders.id, orderId))
    .limit(1);
  if (!order) throw new Error("NOT_FOUND");
  if (order.status === to) return;

  await db.update(s.orders).set({ status: to }).where(eq(s.orders.id, orderId));
  await db.insert(s.orderEvents).values({
    orderId,
    fromStatus: order.status,
    toStatus: to,
    actorId,
    note: note ?? null,
  });
  await writeAudit({
    actorId,
    entity: "order",
    entityId: orderId,
    action: `status_${to}`,
    diff: { from: order.status, to },
  });
  await publishOrders();
}

/** Any admin can jump an order to any status. Side effects stay on the dedicated actions. */
export async function setOrderStatus(form: FormData) {
  const session = await requireAdmin();
  const orderId = text(form, "orderId");
  const to = asStatus(text(form, "to"));
  const note = optional(form, "note");

  if (to === "cancelled") {
    await db
      .update(s.orders)
      .set({ cancelledReason: note })
      .where(eq(s.orders.id, orderId));
  }

  if (to === "delivered") {
    const [current] = await db
      .select({ paymentMethod: s.orders.paymentMethod })
      .from(s.orders)
      .where(eq(s.orders.id, orderId))
      .limit(1);

    await db
      .update(s.deliveries)
      .set({ deliveredAt: new Date() })
      .where(eq(s.deliveries.orderId, orderId));

    if (current?.paymentMethod === "cod") {
      await db
        .update(s.payments)
        .set({
          status: "collected",
          verifiedBy: session.userId,
          verifiedAt: new Date(),
        })
        .where(eq(s.payments.orderId, orderId));
    }
  }

  await transition(orderId, to, session.userId, note);
}

export async function verifyPayment(form: FormData) {
  const session = await requireAdmin();
  const orderId = text(form, "orderId");
  const paymentId = optional(form, "paymentId");

  if (paymentId) {
    await db
      .update(s.payments)
      .set({
        status: "verified",
        verifiedBy: session.userId,
        verifiedAt: new Date(),
      })
      .where(eq(s.payments.id, paymentId));
  }

  await transition(orderId, "confirmed", session.userId, "Payment verified");
}

export async function rejectPayment(form: FormData) {
  const session = await requireAdmin();
  const orderId = text(form, "orderId");
  const paymentId = optional(form, "paymentId");
  const reason = text(form, "rejectReason") as
    | (typeof s.paymentRejectReason.enumValues)[number]
    | "";

  if (paymentId) {
    await db
      .update(s.payments)
      .set({
        status: "rejected",
        rejectReason: reason || "other",
        rejectNote: optional(form, "rejectNote"),
        verifiedBy: session.userId,
        verifiedAt: new Date(),
      })
      .where(eq(s.payments.id, paymentId));
  }

  await transition(orderId, "payment_rejected", session.userId, reason || "rejected");
}

export async function confirmCod(form: FormData) {
  const session = await requireAdmin();
  await transition(text(form, "orderId"), "confirmed", session.userId, "COD confirmed");
}

export async function advanceOrder(form: FormData) {
  const session = await requireAdmin();
  const to = asStatus(text(form, "to"));
  await transition(text(form, "orderId"), to, session.userId);
}

export async function cancelOrder(form: FormData) {
  const session = await requireAdmin();
  const orderId = text(form, "orderId");
  const reason = optional(form, "reason");
  await db
    .update(s.orders)
    .set({ cancelledReason: reason })
    .where(eq(s.orders.id, orderId));
  await transition(orderId, "cancelled", session.userId, reason);
}

export async function dispatchYango(
  _prev: RiderFormState,
  form: FormData,
): Promise<RiderFormState> {
  const session = await requireAdmin();
  const orderId = text(form, "orderId");
  const riderPhone = normalizeNepalPhone(text(form, "riderPhone"));
  if (!riderPhone) {
    return { error: "Enter a 10-digit mobile number, like 9800000000." };
  }

  const existing = await db
    .select({ id: s.deliveries.id, riderPhone: s.deliveries.riderPhone })
    .from(s.deliveries)
    .where(eq(s.deliveries.orderId, orderId));

  const previous = existing.find((row) => row.riderPhone)?.riderPhone ?? null;
  const previousNormalized = previous ? normalizeNepalPhone(previous) : null;
  const yangoRef = optional(form, "yangoRef");
  const payload = {
    riderPhone,
    yangoRef,
    dispatchedBy: session.userId,
    dispatchedAt: new Date(),
  };

  if (existing.length > 0) {
    await db
      .update(s.deliveries)
      .set(payload)
      .where(eq(s.deliveries.orderId, orderId));

    // A second save replaces this rider's earlier number everywhere it was stored.
    const previousCanon = previousNormalized ?? previous?.trim() ?? null;
    if (previous && previousCanon && previousCanon !== riderPhone) {
      const past = new Set<string>([previous.trim()]);
      if (previousNormalized) {
        for (const key of phoneLookupKeys(previousNormalized)) past.add(key);
      }
      await db
        .update(s.deliveries)
        .set({ riderPhone })
        .where(inArray(s.deliveries.riderPhone, [...past]));
    }
  } else {
    await db.insert(s.deliveries).values({ orderId, ...payload });
  }

  await transition(
    orderId,
    "out_for_delivery",
    session.userId,
    yangoRef ? `Yango ${yangoRef}` : "Rider phone saved",
  );
  await publishOrders();
  return { ok: true, at: Date.now() };
}

export async function markDelivered(form: FormData) {
  const session = await requireAdmin();
  const orderId = text(form, "orderId");
  await db
    .update(s.deliveries)
    .set({ deliveredAt: new Date() })
    .where(eq(s.deliveries.orderId, orderId));

  if (text(form, "collectCod") === "1") {
    await db
      .update(s.payments)
      .set({ status: "collected", verifiedBy: session.userId, verifiedAt: new Date() })
      .where(eq(s.payments.orderId, orderId));
  }

  await transition(orderId, "delivered", session.userId);
}

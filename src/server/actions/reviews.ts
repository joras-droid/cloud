"use server";

import { and, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/auth/session";
import { writeAudit } from "@/server/audit";
import { publishReviews } from "@/server/cache";
import { optional, text } from "@/server/form";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ReviewFormError = "invalid" | "rate_limited";
export type ReviewFormState = { ok?: true; error?: ReviewFormError };

export async function submitItemReview(
  _prev: ReviewFormState,
  form: FormData,
): Promise<ReviewFormState> {
  if (text(form, "hp")) return { ok: true };

  const itemId = text(form, "itemId");
  const authorName = text(form, "authorName").replace(/\s+/g, " ").slice(0, 80);
  const body = optional(form, "body");
  const rating = Number(text(form, "rating"));

  if (
    !UUID.test(itemId) ||
    authorName.length < 1 ||
    !/[\p{L}\p{N}]/u.test(authorName) ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    (body != null && body.length > 2000)
  ) {
    return { error: "invalid" };
  }

  const [item] = await db
    .select({ id: s.menuItems.id })
    .from(s.menuItems)
    .where(
      and(
        eq(s.menuItems.id, itemId),
        isNull(s.menuItems.deletedAt),
        ne(s.menuItems.status, "draft"),
      ),
    )
    .limit(1);
  if (!item) return { error: "invalid" };

  const limited = await checkRateLimit(`review:${itemId}`, 8, 600);
  if (!limited.ok) return { error: "rate_limited" };

  await db.insert(s.reviews).values({
    itemId,
    authorName,
    rating,
    body,
    status: "approved",
    publishedAt: new Date(),
  });

  await publishReviews();
  return { ok: true };
}

export async function moderateReview(form: FormData) {
  const session = await requireAdmin("manager");
  const id = text(form, "id");
  const decision = text(form, "decision");
  if (decision !== "approved" && decision !== "rejected") {
    throw new Error("Invalid decision");
  }

  await db
    .update(s.reviews)
    .set({
      status: decision,
      adminNote: optional(form, "adminNote"),
      moderatedBy: session.userId,
      moderatedAt: new Date(),
      publishedAt: decision === "approved" ? new Date() : null,
    })
    .where(eq(s.reviews.id, id));

  await writeAudit({
    actorId: session.userId,
    entity: "review",
    entityId: id,
    action: decision,
  });
  await publishReviews();
}

export async function replyToReview(form: FormData) {
  const session = await requireAdmin("manager");
  const reviewId = text(form, "reviewId");
  const bodyEn = text(form, "bodyEn");
  if (!bodyEn) throw new Error("Reply cannot be empty");

  await db.delete(s.reviewReplies).where(eq(s.reviewReplies.reviewId, reviewId));
  await db.insert(s.reviewReplies).values({
    reviewId,
    bodyEn,
    bodyNe: optional(form, "bodyNe"),
    authorId: session.userId,
  });

  await writeAudit({
    actorId: session.userId,
    entity: "review",
    entityId: reviewId,
    action: "replied",
  });
  await publishReviews();
}

export async function updateReview(form: FormData) {
  const session = await requireAdmin("manager");
  const id = text(form, "id");
  if (!UUID.test(id)) throw new Error("Invalid review");

  const rating = Number(text(form, "rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }
  const body = optional(form, "body");
  if (body && body.length > 2000) throw new Error("Review is too long");
  const authorName = text(form, "authorName").replace(/\s+/g, " ").slice(0, 80);
  if (authorName.length < 1) throw new Error("Name is required");

  await db
    .update(s.reviews)
    .set({ rating, body, authorName })
    .where(eq(s.reviews.id, id));

  await writeAudit({
    actorId: session.userId,
    entity: "review",
    entityId: id,
    action: "edited",
  });
  await publishReviews();
}

export async function deleteReview(form: FormData) {
  const session = await requireAdmin("manager");
  const id = text(form, "id");
  if (!UUID.test(id)) throw new Error("Invalid review");

  await db.delete(s.reviews).where(eq(s.reviews.id, id));

  await writeAudit({
    actorId: session.userId,
    entity: "review",
    entityId: id,
    action: "deleted",
  });
  await publishReviews();
}

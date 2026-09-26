import { and, desc, eq, isNotNull } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import * as s from "@/db/schema";

export type PublicReview = {
  id: string;
  rating: number;
  body: string | null;
  authorName: string;
  publishedAt: Date | null;
  replyEn: string | null;
  replyNe: string | null;
};

/**
 * Only `approved` rows, and the filter lives here rather than in a page so no
 * caller can accidentally render an unmoderated review. Aggregate ratings read
 * from the same source for the same reason.
 */
async function loadApprovedReviews(itemId: string): Promise<PublicReview[]> {
  const rows = await db
    .select({
      id: s.reviews.id,
      rating: s.reviews.rating,
      body: s.reviews.body,
      publishedAt: s.reviews.publishedAt,
      customerName: s.customers.name,
      replyEn: s.reviewReplies.bodyEn,
      replyNe: s.reviewReplies.bodyNe,
    })
    .from(s.reviews)
    .innerJoin(s.customers, eq(s.reviews.customerId, s.customers.id))
    .leftJoin(s.reviewReplies, eq(s.reviewReplies.reviewId, s.reviews.id))
    .where(
      and(
        eq(s.reviews.itemId, itemId),
        eq(s.reviews.status, "approved"),
        isNotNull(s.reviews.body),
      ),
    )
    .orderBy(desc(s.reviews.publishedAt))
    .limit(20);

  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    // First name only: the full name plus a delivery address is more PII than
    // a public page needs.
    authorName: r.customerName.split(" ")[0] ?? r.customerName,
    publishedAt: r.publishedAt,
    replyEn: r.replyEn,
    replyNe: r.replyNe,
  }));
}

export const getApprovedReviews = unstable_cache(
  loadApprovedReviews,
  ["reviews"],
  { tags: ["reviews"], revalidate: 600 },
);

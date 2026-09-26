import { and, desc, eq, isNull } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import * as s from "@/db/schema";

export type PublicReview = {
  id: string;
  rating: number;
  body: string | null;
  authorName: string;
  verified: boolean;
  publishedAt: Date | null;
  replyEn: string | null;
  replyNe: string | null;
};

function displayName(name: string | null): string {
  const first = name?.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : "Guest";
}

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
      authorName: s.reviews.authorName,
      customerName: s.customers.name,
      orderId: s.reviews.orderId,
      replyEn: s.reviewReplies.bodyEn,
      replyNe: s.reviewReplies.bodyNe,
    })
    .from(s.reviews)
    .leftJoin(s.customers, eq(s.reviews.customerId, s.customers.id))
    .leftJoin(s.reviewReplies, eq(s.reviewReplies.reviewId, s.reviews.id))
    .where(
      and(eq(s.reviews.itemId, itemId), eq(s.reviews.status, "approved")),
    )
    .orderBy(desc(s.reviews.publishedAt))
    .limit(20);

  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    // First name only: the full name plus a delivery address is more PII than
    // a public page needs.
    authorName: displayName(r.authorName ?? r.customerName),
    verified: r.orderId != null,
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

export type RecentReview = {
  id: string;
  rating: number;
  body: string | null;
  authorName: string;
  verified: boolean;
  itemNameEn: string | null;
  itemNameNe: string | null;
  itemSlug: string | null;
};

async function loadRecentReviews(limit: number): Promise<RecentReview[]> {
  const rows = await db
    .select({
      id: s.reviews.id,
      rating: s.reviews.rating,
      body: s.reviews.body,
      authorName: s.reviews.authorName,
      customerName: s.customers.name,
      orderId: s.reviews.orderId,
      itemNameEn: s.menuItems.nameEn,
      itemNameNe: s.menuItems.nameNe,
      itemSlug: s.menuItems.slug,
      itemDeletedAt: s.menuItems.deletedAt,
    })
    .from(s.reviews)
    .leftJoin(s.customers, eq(s.reviews.customerId, s.customers.id))
    .leftJoin(s.menuItems, eq(s.reviews.itemId, s.menuItems.id))
    .where(and(eq(s.reviews.status, "approved"), isNull(s.menuItems.deletedAt)))
    .orderBy(desc(s.reviews.publishedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    authorName: displayName(r.authorName ?? r.customerName),
    verified: r.orderId != null,
    itemNameEn: r.itemNameEn,
    itemNameNe: r.itemNameNe,
    itemSlug: r.itemDeletedAt ? null : r.itemSlug,
  }));
}

const loadCachedRecentReviews = unstable_cache(
  loadRecentReviews,
  ["recent-reviews"],
  { tags: ["reviews"], revalidate: 600 },
);

export function getRecentReviews(limit = 3) {
  const size = Math.min(Math.max(limit, 1), 24);
  return loadCachedRecentReviews(size);
}

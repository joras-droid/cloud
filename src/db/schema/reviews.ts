import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { adminUsers } from "./admin";
import { media } from "./media";
import { menuItems } from "./menu";
import { customers, orders } from "./orders";
import { reviewStatus } from "./enums";

/**
 * A review of a dish. `orderId` is set when it came from a delivered order,
 * which is what earns the "Verified order" badge. Public reviews from the
 * dish page leave it empty and store a display name instead.
 * Status defaults to `pending`; the public query layer filters on
 * `approved` so an unmoderated review can never leak into a page or a rating.
 */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "cascade",
    }),
    /** Null for the overall order rating, set for a per-item rating. */
    itemId: uuid("item_id").references(() => menuItems.id),
    customerId: uuid("customer_id").references(() => customers.id),
    /** Shown on the dish page when there is no customer record. */
    authorName: text("author_name"),
    rating: smallint("rating").notNull(),
    body: text("body"),
    status: reviewStatus("status").notNull().default("pending"),
    adminNote: text("admin_note"),
    moderatedBy: uuid("moderated_by").references(() => adminUsers.id),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("reviews_status_idx").on(t.status),
    index("reviews_item_idx").on(t.itemId),
    index("reviews_order_idx").on(t.orderId),
  ],
);

export const reviewMedia = pgTable(
  "review_media",
  {
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.reviewId, t.mediaId] })],
);

/** Admins may reply publicly, and may also edit or remove the review itself. */
export const reviewReplies = pgTable("review_replies", {
  id: uuid("id").primaryKey().defaultRandom(),
  reviewId: uuid("review_id")
    .notNull()
    .references(() => reviews.id, { onDelete: "cascade" }),
  bodyEn: text("body_en").notNull(),
  bodyNe: text("body_ne"),
  authorId: uuid("author_id").references(() => adminUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  order: one(orders, {
    fields: [reviews.orderId],
    references: [orders.id],
  }),
  item: one(menuItems, {
    fields: [reviews.itemId],
    references: [menuItems.id],
  }),
  customer: one(customers, {
    fields: [reviews.customerId],
    references: [customers.id],
  }),
  photos: many(reviewMedia),
  replies: many(reviewReplies),
}));

import { pgEnum } from "drizzle-orm/pg-core";

export const menuItemStatus = pgEnum("menu_item_status", [
  "draft",
  "published",
  "sold_out",
]);

export const mediaKind = pgEnum("media_kind", ["image", "video"]);

export const mediaRole = pgEnum("media_role", ["gallery", "recipe", "process"]);

/**
 * `pending_payment` and `pending_confirmation` are both pre-kitchen states: the
 * QR path waits on a screenshot, the COD path waits on a human. Neither counts
 * as revenue and neither appears in the kitchen queue.
 */
export const orderStatus = pgEnum("order_status", [
  "pending_payment",
  "payment_submitted",
  "payment_rejected",
  "pending_confirmation",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
]);

export const paymentMethod = pgEnum("payment_method", [
  "fonepay",
  "esewa",
  "khalti",
  "bank",
  "cod",
]);

export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "submitted",
  "verified",
  "rejected",
  "collected",
]);

export const paymentRejectReason = pgEnum("payment_reject_reason", [
  "wrong_amount",
  "unreadable",
  "duplicate",
  "not_received",
  "other",
]);

export const reviewStatus = pgEnum("review_status", [
  "pending",
  "approved",
  "rejected",
]);

export const adminRole = pgEnum("admin_role", ["owner", "manager", "staff"]);

export const sectionLayout = pgEnum("section_layout", [
  "full_bleed",
  "split_left",
  "split_right",
  "grid_3",
  "carousel",
]);

export const sectionTheme = pgEnum("section_theme", [
  "light",
  "warm",
  "dark",
  "accent",
]);

export const pageScope = pgEnum("page_scope", ["home", "story", "item"]);

export const blockKind = pgEnum("block_kind", [
  "rich_text",
  "image",
  "gallery",
  "video",
  "item_carousel",
  "stat_strip",
  "quote",
  "ingredient_story",
  "steps",
  "faq",
]);

export const locale = pgEnum("locale", ["en", "ne"]);

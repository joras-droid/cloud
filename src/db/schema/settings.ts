import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Singleton row (id is fixed by the seed). Everything the kitchen needs to
 * change without a deploy lives here.
 */
export const storeSettings = pgTable("store_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  isAcceptingOrders: boolean("is_accepting_orders").notNull().default(true),
  /** [{ day: 0-6, open: "10:00", close: "21:00", closed: false }] */
  openHours: jsonb("open_hours").notNull(),
  minOrder: integer("min_order").notNull().default(0),
  codEnabled: boolean("cod_enabled").notNull().default(true),
  /** Paisa. Caps the blast radius of a prank COD order. */
  codMax: integer("cod_max").notNull().default(300000),
  /** When off, checkout only offers cash on delivery. QR images stay saved. */
  prepayEnabled: boolean("prepay_enabled").notNull().default(true),
  /** [{ method: "fonepay" | "esewa" | "khalti" | "bank", accountName, image, note? }] */
  qrImages: jsonb("qr_images").notNull().default([]),
  bannerEn: text("banner_en"),
  bannerNe: text("banner_ne"),
  supportPhone: text("support_phone"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

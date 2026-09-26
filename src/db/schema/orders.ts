import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { adminUsers } from "./admin";
import { media } from "./media";
import { menuItems } from "./menu";
import {
  locale,
  orderStatus,
  paymentMethod,
  paymentRejectReason,
  paymentStatus,
} from "./enums";

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull(),
  email: text("email"),
  /** Only set once an OTP has been confirmed; required before COD is allowed. */
  phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
  /** Set after repeated COD no-shows. Blocks COD, not the whole account. */
  isBlocked: boolean("is_blocked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Yango is booked by hand and its price is distance-based, so the customer
 * picks a named area instead of a map pin and we charge a flat fee per zone.
 * Kathmandu addresses are landmark-based and largely un-geocodable anyway.
 */
export const deliveryZones = pgTable("delivery_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  nameEn: text("name_en").notNull(),
  nameNe: text("name_ne"),
  fee: integer("fee").notNull(),
  codAllowed: boolean("cod_allowed").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Short, human-readable, read aloud on the phone: GKS-4F7Q. */
    orderCode: text("order_code").notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    status: orderStatus("status").notNull().default("pending_payment"),
    paymentMethod: paymentMethod("payment_method").notNull(),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => deliveryZones.id),
    addressLine: text("address_line").notNull(),
    landmark: text("landmark"),
    lat: text("lat"),
    lng: text("lng"),
    /** Locale the order was placed in, so notifications match the customer. */
    locale: locale("locale").notNull().default("en"),
    subtotal: integer("subtotal").notNull(),
    deliveryFee: integer("delivery_fee").notNull(),
    discount: integer("discount").notNull().default(0),
    total: integer("total").notNull(),
    notes: text("notes"),
    placedAt: timestamp("placed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Unpaid QR orders are swept after 45 minutes. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    cancelledReason: text("cancelled_reason"),
  },
  (t) => [
    index("orders_status_idx").on(t.status),
    index("orders_placed_idx").on(t.placedAt),
    index("orders_customer_idx").on(t.customerId),
  ],
);

/**
 * Snapshots, not references. When tomorrow's momo price changes, yesterday's
 * order must still show what the customer actually agreed to pay.
 */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").references(() => menuItems.id),
    nameEnSnapshot: text("name_en_snapshot").notNull(),
    nameNeSnapshot: text("name_ne_snapshot"),
    unitPriceSnapshot: integer("unit_price_snapshot").notNull(),
    qty: smallint("qty").notNull(),
    variantSnapshot: jsonb("variant_snapshot"),
    modifiersSnapshot: jsonb("modifiers_snapshot"),
    lineTotal: integer("line_total").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: orderStatus("from_status"),
    toStatus: orderStatus("to_status").notNull(),
    actorId: uuid("actor_id").references(() => adminUsers.id),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    method: paymentMethod("method").notNull(),
    amount: integer("amount").notNull(),
    screenshotMediaId: uuid("screenshot_media_id").references(() => media.id),
    payerName: text("payer_name"),
    payerPhone: text("payer_phone"),
    txnRef: text("txn_ref"),
    status: paymentStatus("status").notNull().default("pending"),
    rejectReason: paymentRejectReason("reject_reason"),
    rejectNote: text("reject_note"),
    verifiedBy: uuid("verified_by").references(() => adminUsers.id),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("payments_order_idx").on(t.orderId)],
);

/**
 * Manual Yango dispatch. Shaped so a real API can populate the same row later
 * without a migration.
 */
export const deliveries = pgTable("deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  riderName: text("rider_name"),
  riderPhone: text("rider_phone"),
  yangoRef: text("yango_ref"),
  dispatchedBy: uuid("dispatched_by").references(() => adminUsers.id),
  dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  zone: one(deliveryZones, {
    fields: [orders.zoneId],
    references: [deliveryZones.id],
  }),
  items: many(orderItems),
  events: many(orderEvents),
  payments: many(payments),
  delivery: one(deliveries),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
  screenshot: one(media, {
    fields: [payments.screenshotMediaId],
    references: [media.id],
  }),
}));

export const deliveriesRelations = relations(deliveries, ({ one }) => ({
  order: one(orders, {
    fields: [deliveries.orderId],
    references: [orders.id],
  }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

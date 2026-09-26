import { index, pgTable, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { officeMeal } from "./enums";

/**
 * A quotation request from an office or other regular business. Not an order:
 * the kitchen calls back with a price. Days use the same 0–6 numbering as
 * store hours (0 = Sunday).
 */
export const businessInquiries = pgTable(
  "business_inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessName: text("business_name").notNull(),
    location: text("location").notNull(),
    phone: text("phone").notNull(),
    days: smallint("days").array().notNull(),
    meal: officeMeal("meal").notNull(),
    /** One of the fixed ranges in `src/lib/office-inquiry.ts`. */
    headcountRange: text("headcount_range").notNull(),
    /** "HH:MM" in Nepal local time. Set when meal is lunch or both. */
    lunchTime: text("lunch_time"),
    /** "HH:MM" in Nepal local time. Set when meal is snacks or both. */
    snacksTime: text("snacks_time"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("business_inquiries_created_idx").on(t.createdAt)],
);

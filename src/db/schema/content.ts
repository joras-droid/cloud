import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { blockKind, pageScope, sectionLayout, sectionTheme } from "./enums";

/**
 * Admin-authored highlight sections. Layout and theme are constrained to
 * presets and design tokens — there is deliberately no raw HTML or CSS field,
 * which would be both an XSS hole and a guarantee of brand drift.
 */
export const sections = pgTable(
  "sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    titleEn: text("title_en").notNull(),
    titleNe: text("title_ne"),
    subtitleEn: text("subtitle_en"),
    subtitleNe: text("subtitle_ne"),
    layout: sectionLayout("layout").notNull().default("full_bleed"),
    theme: sectionTheme("theme").notNull().default("light"),
    pageScope: pageScope("page_scope").notNull().default("home"),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("sections_scope_idx").on(t.pageScope, t.isPublished)],
);

/**
 * `payload` is validated by a per-kind Zod schema on write, so the JSONB is
 * only loose at the database boundary, never in application code.
 */
export const blocks = pgTable(
  "blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    kind: blockKind("kind").notNull(),
    payload: jsonb("payload").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("blocks_section_idx").on(t.sectionId)],
);

export const sectionsRelations = relations(sections, ({ many }) => ({
  blocks: many(blocks),
}));

export const blocksRelations = relations(blocks, ({ one }) => ({
  section: one(sections, {
    fields: [blocks.sectionId],
    references: [sections.id],
  }),
}));

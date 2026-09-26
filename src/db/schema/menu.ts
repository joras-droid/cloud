import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { media } from "./media";
import { mediaRole, menuItemStatus } from "./enums";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  nameEn: text("name_en").notNull(),
  nameNe: text("name_ne"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    nameEn: text("name_en").notNull(),
    nameNe: text("name_ne"),
    descEn: text("desc_en"),
    descNe: text("desc_ne"),
    /** Paisa. Never a float. */
    basePrice: integer("base_price").notNull(),
    isVeg: boolean("is_veg").notNull().default(false),
    spiceLevel: smallint("spice_level").notNull().default(0),
    prepMinutes: integer("prep_minutes").notNull().default(20),
    status: menuItemStatus("status").notNull().default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    heroMediaId: uuid("hero_media_id").references(() => media.id),
    seoTitle: text("seo_title"),
    seoDesc: text("seo_desc"),
    /** Soft delete: hard deletes would orphan line items in past orders. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("menu_items_category_idx").on(t.categoryId),
    index("menu_items_status_idx").on(t.status),
  ],
);

export const itemVariants = pgTable("item_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => menuItems.id, { onDelete: "cascade" }),
  labelEn: text("label_en").notNull(),
  labelNe: text("label_ne"),
  priceDelta: integer("price_delta").notNull().default(0),
  isDefault: boolean("is_default").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const modifierGroups = pgTable("modifier_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  nameEn: text("name_en").notNull(),
  nameNe: text("name_ne"),
  minSelect: smallint("min_select").notNull().default(0),
  maxSelect: smallint("max_select").notNull().default(1),
  isRequired: boolean("is_required").notNull().default(false),
});

export const modifiers = pgTable("modifiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => modifierGroups.id, { onDelete: "cascade" }),
  nameEn: text("name_en").notNull(),
  nameNe: text("name_ne"),
  priceDelta: integer("price_delta").notNull().default(0),
  isAvailable: boolean("is_available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const itemModifierGroups = pgTable(
  "item_modifier_groups",
  {
    itemId: uuid("item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => modifierGroups.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.groupId] })],
);

export const itemMedia = pgTable(
  "item_media",
  {
    itemId: uuid("item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    role: mediaRole("role").notNull().default("gallery"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.mediaId, t.role] })],
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  items: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  category: one(categories, {
    fields: [menuItems.categoryId],
    references: [categories.id],
  }),
  hero: one(media, {
    fields: [menuItems.heroMediaId],
    references: [media.id],
  }),
  variants: many(itemVariants),
  modifierGroups: many(itemModifierGroups),
  gallery: many(itemMedia),
}));

export const itemVariantsRelations = relations(itemVariants, ({ one }) => ({
  item: one(menuItems, {
    fields: [itemVariants.itemId],
    references: [menuItems.id],
  }),
}));

export const modifierGroupsRelations = relations(
  modifierGroups,
  ({ many }) => ({
    modifiers: many(modifiers),
    items: many(itemModifierGroups),
  }),
);

export const modifiersRelations = relations(modifiers, ({ one }) => ({
  group: one(modifierGroups, {
    fields: [modifiers.groupId],
    references: [modifierGroups.id],
  }),
}));

export const itemModifierGroupsRelations = relations(
  itemModifierGroups,
  ({ one }) => ({
    item: one(menuItems, {
      fields: [itemModifierGroups.itemId],
      references: [menuItems.id],
    }),
    group: one(modifierGroups, {
      fields: [itemModifierGroups.groupId],
      references: [modifierGroups.id],
    }),
  }),
);

export const itemMediaRelations = relations(itemMedia, ({ one }) => ({
  item: one(menuItems, {
    fields: [itemMedia.itemId],
    references: [menuItems.id],
  }),
  media: one(media, {
    fields: [itemMedia.mediaId],
    references: [media.id],
  }),
}));

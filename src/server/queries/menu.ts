import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import * as s from "@/db/schema";
import { mediaUrl } from "@/lib/media";

export type MenuModifier = {
  id: string;
  nameEn: string;
  nameNe: string | null;
  priceDelta: number;
};

export type MenuModifierGroup = {
  id: string;
  nameEn: string;
  nameNe: string | null;
  minSelect: number;
  maxSelect: number;
  isRequired: boolean;
  modifiers: MenuModifier[];
};

export type MenuVariant = {
  id: string;
  labelEn: string;
  labelNe: string | null;
  priceDelta: number;
  isDefault: boolean;
};

export type MenuItem = {
  id: string;
  slug: string;
  categoryId: string;
  nameEn: string;
  nameNe: string | null;
  descEn: string | null;
  descNe: string | null;
  basePrice: number;
  isVeg: boolean;
  spiceLevel: number;
  prepMinutes: number;
  isSoldOut: boolean;
  image: string | null;
  imageAltEn: string | null;
  imageAltNe: string | null;
  variants: MenuVariant[];
  modifierGroups: MenuModifierGroup[];
};

export type MenuCategory = {
  id: string;
  slug: string;
  nameEn: string;
  nameNe: string | null;
  items: MenuItem[];
};

/**
 * One query per relation rather than a single wide join: the menu is small
 * (tens of rows) and assembling in memory keeps the SQL readable and avoids
 * the row explosion a three-way join would produce.
 */
async function loadMenu(): Promise<MenuCategory[]> {
  const categories = await db
    .select()
    .from(s.categories)
    .where(eq(s.categories.isActive, true))
    .orderBy(asc(s.categories.sortOrder));

  const items = await db
    .select({
      item: s.menuItems,
      heroKey: s.media.r2Key,
      heroAltEn: s.media.altEn,
      heroAltNe: s.media.altNe,
    })
    .from(s.menuItems)
    .leftJoin(s.media, eq(s.menuItems.heroMediaId, s.media.id))
    .where(
      and(
        isNull(s.menuItems.deletedAt),
        ne(s.menuItems.status, "draft"),
        eq(s.categories.isActive, true),
      ),
    )
    .innerJoin(s.categories, eq(s.menuItems.categoryId, s.categories.id))
    .orderBy(asc(s.menuItems.sortOrder));

  const variants = await db
    .select()
    .from(s.itemVariants)
    .orderBy(asc(s.itemVariants.sortOrder));

  const links = await db
    .select()
    .from(s.itemModifierGroups)
    .orderBy(asc(s.itemModifierGroups.sortOrder));

  const groups = await db.select().from(s.modifierGroups);

  const mods = await db
    .select()
    .from(s.modifiers)
    .where(eq(s.modifiers.isAvailable, true))
    .orderBy(asc(s.modifiers.sortOrder));

  const modsByGroup = new Map<string, MenuModifier[]>();
  for (const m of mods) {
    const list = modsByGroup.get(m.groupId) ?? [];
    list.push({
      id: m.id,
      nameEn: m.nameEn,
      nameNe: m.nameNe,
      priceDelta: m.priceDelta,
    });
    modsByGroup.set(m.groupId, list);
  }

  const groupById = new Map(groups.map((g) => [g.id, g]));

  const groupsByItem = new Map<string, MenuModifierGroup[]>();
  for (const link of links) {
    const g = groupById.get(link.groupId);
    if (!g) continue;
    const list = groupsByItem.get(link.itemId) ?? [];
    list.push({
      id: g.id,
      nameEn: g.nameEn,
      nameNe: g.nameNe,
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      isRequired: g.isRequired,
      modifiers: modsByGroup.get(g.id) ?? [],
    });
    groupsByItem.set(link.itemId, list);
  }

  const variantsByItem = new Map<string, MenuVariant[]>();
  for (const v of variants) {
    const list = variantsByItem.get(v.itemId) ?? [];
    list.push({
      id: v.id,
      labelEn: v.labelEn,
      labelNe: v.labelNe,
      priceDelta: v.priceDelta,
      isDefault: v.isDefault,
    });
    variantsByItem.set(v.itemId, list);
  }

  const itemsByCategory = new Map<string, MenuItem[]>();
  for (const { item, heroKey, heroAltEn, heroAltNe } of items) {
    const list = itemsByCategory.get(item.categoryId) ?? [];
    list.push({
      id: item.id,
      slug: item.slug,
      categoryId: item.categoryId,
      nameEn: item.nameEn,
      nameNe: item.nameNe,
      descEn: item.descEn,
      descNe: item.descNe,
      basePrice: item.basePrice,
      isVeg: item.isVeg,
      spiceLevel: item.spiceLevel,
      prepMinutes: item.prepMinutes,
      isSoldOut: item.status === "sold_out",
      image: mediaUrl(heroKey),
      imageAltEn: heroAltEn,
      imageAltNe: heroAltNe,
      variants: variantsByItem.get(item.id) ?? [],
      modifierGroups: groupsByItem.get(item.id) ?? [],
    });
    itemsByCategory.set(item.categoryId, list);
  }

  return categories
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      nameEn: c.nameEn,
      nameNe: c.nameNe,
      items: itemsByCategory.get(c.id) ?? [],
    }))
    .filter((c) => c.items.length > 0);
}

/**
 * Tagged so publishing from the admin (`revalidateTag("menu")`) makes a price
 * change live in seconds without a rebuild. The one-hour window is just a
 * backstop for anything that bypasses the tag.
 */
export const getMenu = unstable_cache(loadMenu, ["menu"], {
  tags: ["menu"],
  revalidate: 3600,
});

export async function getMenuItem(slug: string): Promise<MenuItem | null> {
  const menu = await getMenu();
  for (const cat of menu) {
    const found = cat.items.find((i) => i.slug === slug);
    if (found) return found;
  }
  return null;
}

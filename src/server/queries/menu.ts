import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import * as s from "@/db/schema";
import { mediaUrl } from "@/lib/media";
import { ONION_GARLIC_GROUP_NAME_EN } from "@/lib/menu/onion-garlic";

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
  isSoldOut: boolean;
  image: string | null;
  imageAltEn: string | null;
  imageAltNe: string | null;
  /** Highlight first, then the rest, in the order they rotate on the menu. */
  media: { url: string; kind: "image" | "video" }[];
  remarksEn: string | null;
  remarksNe: string | null;
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
      heroId: s.media.id,
      heroKind: s.media.kind,
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

  const gallery = await db
    .select({
      itemId: s.itemMedia.itemId,
      id: s.media.id,
      kind: s.media.kind,
      r2Key: s.media.r2Key,
      sortOrder: s.itemMedia.sortOrder,
    })
    .from(s.itemMedia)
    .innerJoin(s.media, eq(s.itemMedia.mediaId, s.media.id))
    .orderBy(asc(s.itemMedia.sortOrder));

  const galleryByItem = new Map<
    string,
    { id: string; kind: "image" | "video"; url: string; sortOrder: number }[]
  >();
  for (const row of gallery) {
    const url = mediaUrl(row.r2Key);
    if (!url) continue;
    const list = galleryByItem.get(row.itemId) ?? [];
    list.push({ id: row.id, kind: row.kind, url, sortOrder: row.sortOrder });
    galleryByItem.set(row.itemId, list);
  }

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
    if (!g || g.nameEn !== ONION_GARLIC_GROUP_NAME_EN) continue;
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

  const itemsByCategory = new Map<string, MenuItem[]>();
  for (const { item, heroId, heroKind, heroKey, heroAltEn, heroAltNe } of items) {
    const slides = new Map<string, { url: string; kind: "image" | "video"; sort: number }>();
    const heroUrl = mediaUrl(heroKey);
    if (heroId && heroUrl && heroKind) {
      slides.set(heroId, { url: heroUrl, kind: heroKind, sort: -1 });
    }
    for (const extra of galleryByItem.get(item.id) ?? []) {
      if (!slides.has(extra.id)) {
        slides.set(extra.id, {
          url: extra.url,
          kind: extra.kind,
          sort: extra.sortOrder,
        });
      }
    }
    const ordered = [...slides.entries()].sort((a, b) => a[1].sort - b[1].sort);
    const highlight = heroId ? ordered.find(([id]) => id === heroId) : undefined;
    const rest = ordered.filter(([id]) => id !== heroId);
    const media = (highlight ? [highlight, ...rest] : ordered).map(([, slide]) => ({
      url: slide.url,
      kind: slide.kind,
    }));
    const still = media.find((slide) => slide.kind === "image");

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
      isSoldOut: item.status === "sold_out",
      image: still?.url ?? null,
      imageAltEn: heroAltEn,
      imageAltNe: heroAltNe,
      media,
      remarksEn: item.remarksEn,
      remarksNe: item.remarksNe,
      variants: [],
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

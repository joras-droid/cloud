import "server-only";
import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { mediaUrl } from "@/lib/media";
import { ONION_GARLIC_GROUP_NAME_EN } from "@/lib/menu/onion-garlic";

export type AdminCategory = {
  id: string;
  slug: string;
  nameEn: string;
  nameNe: string | null;
};

export type AdminModifier = {
  id: string;
  nameEn: string;
  nameNe: string | null;
  priceDelta: number;
  isAvailable: boolean;
  sortOrder: number;
};

export type AdminModifierGroup = {
  id: string;
  nameEn: string;
  nameNe: string | null;
  minSelect: number;
  maxSelect: number;
  isRequired: boolean;
  modifiers: AdminModifier[];
  usedBy: number;
};

export type DishMedia = {
  id: string;
  url: string | null;
  kind: "image" | "video";
  isHighlight: boolean;
};

export type AdminItemDetail = {
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
  status: (typeof s.menuItemStatus.enumValues)[number];
  media: DishMedia[];
  seoTitle: string | null;
  seoDesc: string | null;
  remarksEn: string | null;
  remarksNe: string | null;
  onionGarlicEnabled: boolean;
};

export async function getAdminCategories(): Promise<AdminCategory[]> {
  return db
    .select({
      id: s.categories.id,
      slug: s.categories.slug,
      nameEn: s.categories.nameEn,
      nameNe: s.categories.nameNe,
    })
    .from(s.categories)
    .where(eq(s.categories.isActive, true))
    .orderBy(asc(s.categories.sortOrder));
}

export async function getAdminModifierGroups(): Promise<AdminModifierGroup[]> {
  const groups = await db
    .select()
    .from(s.modifierGroups)
    .orderBy(asc(s.modifierGroups.nameEn));

  const mods = await db
    .select()
    .from(s.modifiers)
    .orderBy(asc(s.modifiers.sortOrder));

  const usage = await db
    .select({
      groupId: s.itemModifierGroups.groupId,
      n: count(),
    })
    .from(s.itemModifierGroups)
    .groupBy(s.itemModifierGroups.groupId);

  const usedBy = new Map(usage.map((u) => [u.groupId, Number(u.n)]));
  const byGroup = new Map<string, AdminModifier[]>();
  for (const m of mods) {
    const list = byGroup.get(m.groupId) ?? [];
    list.push({
      id: m.id,
      nameEn: m.nameEn,
      nameNe: m.nameNe,
      priceDelta: m.priceDelta,
      isAvailable: m.isAvailable,
      sortOrder: m.sortOrder,
    });
    byGroup.set(m.groupId, list);
  }

  return groups.map((g) => ({
    id: g.id,
    nameEn: g.nameEn,
    nameNe: g.nameNe,
    minSelect: g.minSelect,
    maxSelect: g.maxSelect,
    isRequired: g.isRequired,
    modifiers: byGroup.get(g.id) ?? [],
    usedBy: usedBy.get(g.id) ?? 0,
  }));
}

export async function getAdminItem(
  id: string,
): Promise<AdminItemDetail | null> {
  const [row] = await db
    .select({
      item: s.menuItems,
      heroId: s.media.id,
      heroKind: s.media.kind,
      heroKey: s.media.r2Key,
    })
    .from(s.menuItems)
    .leftJoin(s.media, eq(s.menuItems.heroMediaId, s.media.id))
    .where(and(eq(s.menuItems.id, id), isNull(s.menuItems.deletedAt)))
    .limit(1);

  if (!row) return null;

  const links = await db
    .select({
      groupId: s.itemModifierGroups.groupId,
      nameEn: s.modifierGroups.nameEn,
    })
    .from(s.itemModifierGroups)
    .innerJoin(
      s.modifierGroups,
      eq(s.itemModifierGroups.groupId, s.modifierGroups.id),
    )
    .where(eq(s.itemModifierGroups.itemId, id));

  const linked = await db
    .select({
      id: s.media.id,
      kind: s.media.kind,
      r2Key: s.media.r2Key,
      sortOrder: s.itemMedia.sortOrder,
    })
    .from(s.itemMedia)
    .innerJoin(s.media, eq(s.itemMedia.mediaId, s.media.id))
    .where(eq(s.itemMedia.itemId, id))
    .orderBy(asc(s.itemMedia.sortOrder));

  const slides = new Map<string, DishMedia & { sort: number }>();
  if (row.heroId && row.heroKind) {
    slides.set(row.heroId, {
      id: row.heroId,
      url: mediaUrl(row.heroKey),
      kind: row.heroKind,
      isHighlight: true,
      sort: -1,
    });
  }
  for (const extra of linked) {
    if (slides.has(extra.id)) continue;
    slides.set(extra.id, {
      id: extra.id,
      url: mediaUrl(extra.r2Key),
      kind: extra.kind,
      isHighlight: extra.id === row.item.heroMediaId,
      sort: extra.sortOrder,
    });
  }
  const ordered = [...slides.values()].sort((a, b) => a.sort - b.sort);
  const highlight = ordered.find((slide) => slide.id === row.item.heroMediaId);
  const media = (highlight ? [highlight, ...ordered.filter((s) => s !== highlight)] : ordered).map(
    ({ sort: _sort, ...slide }) => ({
      ...slide,
      isHighlight: slide.id === row.item.heroMediaId,
    }),
  );

  return {
    id: row.item.id,
    slug: row.item.slug,
    categoryId: row.item.categoryId,
    nameEn: row.item.nameEn,
    nameNe: row.item.nameNe,
    descEn: row.item.descEn,
    descNe: row.item.descNe,
    remarksEn: row.item.remarksEn,
    remarksNe: row.item.remarksNe,
    basePrice: row.item.basePrice,
    isVeg: row.item.isVeg,
    spiceLevel: row.item.spiceLevel,
    status: row.item.status,
    media,
    seoTitle: row.item.seoTitle,
    seoDesc: row.item.seoDesc,
    onionGarlicEnabled: links.some(
      (l) => l.nameEn === ONION_GARLIC_GROUP_NAME_EN,
    ),
  };
}

export async function getAdminMediaLibrary() {
  const rows = await db
    .select()
    .from(s.media)
    .orderBy(sql`${s.media.createdAt} desc`)
    .limit(200);

  return rows.map((m) => ({
    id: m.id,
    kind: m.kind,
    url: mediaUrl(m.r2Key),
    altEn: m.altEn,
    altNe: m.altNe,
    mime: m.mime,
    createdAt: m.createdAt,
  }));
}

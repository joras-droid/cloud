import { and, asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import * as s from "@/db/schema";
import { parseBlock, type BlockPayload } from "@/lib/blocks/schemas";

export type RenderableSection = {
  id: string;
  slug: string;
  titleEn: string;
  titleNe: string | null;
  subtitleEn: string | null;
  subtitleNe: string | null;
  layout: (typeof s.sectionLayout.enumValues)[number];
  theme: (typeof s.sectionTheme.enumValues)[number];
  blocks: (BlockPayload & { id: string })[];
};

type Scope = (typeof s.pageScope.enumValues)[number];

async function loadSections(scope: Scope): Promise<RenderableSection[]> {
  const rows = await db
    .select()
    .from(s.sections)
    .where(
      and(eq(s.sections.pageScope, scope), eq(s.sections.isPublished, true)),
    )
    .orderBy(asc(s.sections.sortOrder));

  if (rows.length === 0) return [];

  const blockRows = await db
    .select()
    .from(s.blocks)
    .orderBy(asc(s.blocks.sortOrder));

  const bySection = new Map<string, (BlockPayload & { id: string })[]>();
  for (const b of blockRows) {
    // A payload that no longer matches its schema is dropped rather than
    // allowed to throw — one bad block must not take down the homepage.
    const parsed = parseBlock(b.kind, b.payload);
    if (!parsed) continue;
    const list = bySection.get(b.sectionId) ?? [];
    list.push({ ...parsed, id: b.id });
    bySection.set(b.sectionId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    titleEn: row.titleEn,
    titleNe: row.titleNe,
    subtitleEn: row.subtitleEn,
    subtitleNe: row.subtitleNe,
    layout: row.layout,
    theme: row.theme,
    blocks: bySection.get(row.id) ?? [],
  }));
}

export const getPublishedSections = unstable_cache(loadSections, ["sections"], {
  tags: ["sections"],
  revalidate: 3600,
});

/** Draft preview: uncached, so the admin sees edits immediately. */
export async function getSectionBySlug(
  slug: string,
): Promise<RenderableSection | null> {
  const [row] = await db
    .select()
    .from(s.sections)
    .where(eq(s.sections.slug, slug))
    .limit(1);
  if (!row) return null;

  const blockRows = await db
    .select()
    .from(s.blocks)
    .where(eq(s.blocks.sectionId, row.id))
    .orderBy(asc(s.blocks.sortOrder));

  return {
    id: row.id,
    slug: row.slug,
    titleEn: row.titleEn,
    titleNe: row.titleNe,
    subtitleEn: row.subtitleEn,
    subtitleNe: row.subtitleNe,
    layout: row.layout,
    theme: row.theme,
    blocks: blockRows
      .map((b) => {
        const parsed = parseBlock(b.kind, b.payload);
        return parsed ? { ...parsed, id: b.id } : null;
      })
      .filter((b): b is BlockPayload & { id: string } => b !== null),
  };
}

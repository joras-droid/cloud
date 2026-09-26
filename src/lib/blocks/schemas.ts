import { z } from "zod";

/**
 * One Zod schema per block kind. The database column is JSONB, but nothing in
 * application code ever touches an unvalidated payload: writes are parsed on
 * the way in and reads are parsed on the way out, so a malformed block renders
 * as nothing rather than crashing a page.
 *
 * Note what is deliberately absent: any field that accepts raw HTML or CSS.
 * That would be an XSS hole and would let the site drift off-brand within a
 * month. Admins choose from layouts and tokens instead.
 */

const mediaRef = z.object({
  mediaId: z.string().optional(),
  url: z.string().min(1),
  altEn: z.string().nullable().optional(),
  altNe: z.string().nullable().optional(),
});

export const richTextPayload = z.object({
  headingEn: z.string().nullable().optional(),
  headingNe: z.string().nullable().optional(),
  bodyEn: z.string().min(1),
  bodyNe: z.string().nullable().optional(),
});

export const imagePayload = z.object({
  media: mediaRef,
  captionEn: z.string().nullable().optional(),
  captionNe: z.string().nullable().optional(),
});

export const galleryPayload = z.object({
  items: z.array(mediaRef).min(1).max(12),
});

export const videoPayload = z.object({
  url: z.url(),
  posterUrl: z.string().nullable().optional(),
  titleEn: z.string().nullable().optional(),
  titleNe: z.string().nullable().optional(),
});

export const itemCarouselPayload = z.object({
  /** References live menu items so displayed prices can never go stale. */
  itemIds: z.array(z.uuid()).min(1).max(12),
});

export const statStripPayload = z.object({
  stats: z
    .array(
      z.object({
        value: z.string().min(1),
        labelEn: z.string().min(1),
        labelNe: z.string().nullable().optional(),
      }),
    )
    .min(1)
    .max(4),
});

export const quotePayload = z.object({
  bodyEn: z.string().min(1),
  bodyNe: z.string().nullable().optional(),
  attribution: z.string().nullable().optional(),
});

export const ingredientStoryPayload = z.object({
  media: mediaRef.nullable().optional(),
  nameEn: z.string().min(1),
  nameNe: z.string().nullable().optional(),
  sourceEn: z.string().nullable().optional(),
  sourceNe: z.string().nullable().optional(),
  bodyEn: z.string().min(1),
  bodyNe: z.string().nullable().optional(),
});

export const stepsPayload = z.object({
  steps: z
    .array(
      z.object({
        titleEn: z.string().min(1),
        titleNe: z.string().nullable().optional(),
        bodyEn: z.string().nullable().optional(),
        bodyNe: z.string().nullable().optional(),
        media: mediaRef.nullable().optional(),
      }),
    )
    .min(1)
    .max(12),
});

export const faqPayload = z.object({
  entries: z
    .array(
      z.object({
        questionEn: z.string().min(1),
        questionNe: z.string().nullable().optional(),
        answerEn: z.string().min(1),
        answerNe: z.string().nullable().optional(),
      }),
    )
    .min(1)
    .max(20),
});

export const blockSchemas = {
  rich_text: richTextPayload,
  image: imagePayload,
  gallery: galleryPayload,
  video: videoPayload,
  item_carousel: itemCarouselPayload,
  stat_strip: statStripPayload,
  quote: quotePayload,
  ingredient_story: ingredientStoryPayload,
  steps: stepsPayload,
  faq: faqPayload,
} as const;

export type BlockKind = keyof typeof blockSchemas;

export type BlockPayload = {
  [K in BlockKind]: { kind: K; payload: z.infer<(typeof blockSchemas)[K]> };
}[BlockKind];

export function parseBlock(
  kind: string,
  payload: unknown,
): BlockPayload | null {
  const schema = blockSchemas[kind as BlockKind];
  if (!schema) return null;
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return null;
  return { kind, payload: parsed.data } as BlockPayload;
}

/** Labels for the admin block picker. */
export const BLOCK_LABELS: Record<BlockKind, string> = {
  rich_text: "Text",
  image: "Image",
  gallery: "Gallery",
  video: "Video",
  item_carousel: "Menu items",
  stat_strip: "Stat strip",
  quote: "Quote",
  ingredient_story: "Ingredient story",
  steps: "Steps",
  faq: "FAQ",
};

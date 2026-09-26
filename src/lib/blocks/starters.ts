import type { BlockKind } from "@/lib/blocks/schemas";

/**
 * Valid starter payloads so a new block can be inserted without the admin
 * writing JSON. They pass the Zod schemas; the cook then replaces the words
 * and photos in the visual form.
 */
export function emptyBlockPayload(
  kind: BlockKind,
  extras?: { itemIds?: string[] },
): unknown {
  switch (kind) {
    case "rich_text":
      return {
        headingEn: "Heading",
        headingNe: "",
        bodyEn: "Write the story here.",
        bodyNe: "",
      };
    case "image":
      return {
        media: {
          url: "https://picsum.photos/seed/section/1200/800",
          altEn: "Kitchen photo",
          altNe: "",
        },
        captionEn: "",
        captionNe: "",
      };
    case "gallery":
      return {
        items: [
          {
            url: "https://picsum.photos/seed/g1/800/800",
            altEn: "Photo",
            altNe: "",
          },
        ],
      };
    case "video":
      return {
        url: "https://example.com/recipe.mp4",
        posterUrl: "",
        titleEn: "How it is made",
        titleNe: "",
      };
    case "item_carousel":
      return { itemIds: (extras?.itemIds ?? []).slice(0, 4) };
    case "stat_strip":
      return {
        stats: [{ value: "12", labelEn: "Local farms", labelNe: "स्थानीय किसान" }],
      };
    case "quote":
      return {
        bodyEn: "A line from the kitchen or a guest.",
        bodyNe: "",
        attribution: "",
      };
    case "ingredient_story":
      return {
        nameEn: "Ingredient",
        nameNe: "",
        sourceEn: "",
        sourceNe: "",
        bodyEn: "Where it comes from and why it matters.",
        bodyNe: "",
      };
    case "steps":
      return { steps: [{ titleEn: "Step one", titleNe: "", bodyEn: "", bodyNe: "" }] };
    case "faq":
      return {
        entries: [
          { questionEn: "Question", questionNe: "", answerEn: "Answer", answerNe: "" },
        ],
      };
  }
}

/** Kinds shown on the “add a block” bar — the ones a cook can fill without help. */
export const EASY_BLOCK_KINDS: BlockKind[] = [
  "rich_text",
  "image",
  "gallery",
  "video",
  "quote",
  "ingredient_story",
  "stat_strip",
  "steps",
  "faq",
];

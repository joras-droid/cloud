"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { saveBlock } from "@/server/actions/content";
import { BLOCK_LABELS, type BlockKind } from "@/lib/blocks/schemas";

const STARTERS: Record<BlockKind, unknown> = {
  rich_text: { bodyEn: "Write the story here." },
  quote: { bodyEn: "A customer or chef quote." },
  stat_strip: {
    stats: [{ value: "12", labelEn: "Local farms", labelNe: "स्थानीय किसान" }],
  },
  ingredient_story: {
    nameEn: "Ingredient",
    bodyEn: "Where it comes from and why it matters.",
  },
  steps: { steps: [{ titleEn: "Step one", bodyEn: "" }] },
  faq: { entries: [{ questionEn: "Question", answerEn: "Answer" }] },
  video: { url: "https://example.com/recipe.mp4", titleEn: "How it is made" },
  item_carousel: { itemIds: [] },
  image: {
    media: {
      mediaId: "00000000-0000-0000-0000-000000000001",
      url: "https://picsum.photos/seed/section/1200/800",
      altEn: "Kitchen",
    },
  },
  gallery: {
    items: [
      {
        mediaId: "00000000-0000-0000-0000-000000000001",
        url: "https://picsum.photos/seed/g1/800/800",
        altEn: "Photo",
      },
    ],
  },
};

export function AddBlockForm({
  sectionId,
  itemIds,
}: {
  sectionId: string;
  itemIds: string[];
}) {
  const [kind, setKind] = useState<BlockKind>("rich_text");
  const payload =
    kind === "item_carousel"
      ? { itemIds: itemIds.slice(0, 4) }
      : STARTERS[kind];

  return (
    <form action={saveBlock} className="grid gap-3 rounded-card border border-dashed border-line p-5">
      <h3 className="font-semibold">Add a block</h3>
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      <Select
        value={kind}
        onChange={(e) => setKind(e.target.value as BlockKind)}
      >
        {Object.entries(BLOCK_LABELS).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="outline">
        Add {BLOCK_LABELS[kind].toLowerCase()} block
      </Button>
    </form>
  );
}

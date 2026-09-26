"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ImageIcon,
  Images,
  Leaf,
  ListOrdered,
  Quote,
  Plus,
  Trash2,
  Type,
  Video,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import {
  deleteBlock,
  deleteSection,
  moveBlock,
  saveBlock,
  saveSection,
} from "@/server/actions/content";
import { BLOCK_LABELS, type BlockKind } from "@/lib/blocks/schemas";
import { EASY_BLOCK_KINDS, emptyBlockPayload } from "@/lib/blocks/starters";
import {
  MediaPickerField,
  type LibraryMedia,
  type MediaDraft,
} from "@/components/admin/media-picker-field";

type SectionRecord = {
  id: string;
  titleEn: string;
  titleNe: string | null;
  subtitleEn: string | null;
  subtitleNe: string | null;
  pageScope: string;
  layout: string;
  theme: string;
  isPublished: boolean;
};

type BlockRecord = {
  id: string;
  kind: string;
  payload: unknown;
  sortOrder: number;
};

type MenuChoice = { id: string; nameEn: string };

const BLOCK_ICONS: Record<BlockKind, typeof Type> = {
  rich_text: Type,
  image: ImageIcon,
  gallery: Images,
  video: Video,
  item_carousel: Hash,
  stat_strip: Hash,
  quote: Quote,
  ingredient_story: Leaf,
  steps: ListOrdered,
  faq: HelpCircle,
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function mediaDraft(value: unknown): MediaDraft {
  const rec = asRecord(value);
  return {
    mediaId: typeof rec.mediaId === "string" ? rec.mediaId : undefined,
    url: typeof rec.url === "string" ? rec.url : "",
    altEn: typeof rec.altEn === "string" ? rec.altEn : "",
    altNe: typeof rec.altNe === "string" ? rec.altNe : "",
  };
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function SectionEditor({
  section,
  blocks,
  media,
  items,
}: {
  section: SectionRecord;
  blocks: BlockRecord[];
  media: LibraryMedia[];
  items: MenuChoice[];
}) {
  return (
    <div className="max-w-3xl">
      <form
        action={saveSection}
        className="mb-10 grid gap-3 rounded-card border border-line bg-paper p-5"
      >
        <input type="hidden" name="id" value={section.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="titleEn">Title (English)</Label>
            <Input
              id="titleEn"
              name="titleEn"
              defaultValue={section.titleEn}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="titleNe">Title (Nepali)</Label>
            <Input
              id="titleNe"
              name="titleNe"
              defaultValue={section.titleNe ?? ""}
              className="mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="subtitleEn">Subtitle (English)</Label>
            <Input
              id="subtitleEn"
              name="subtitleEn"
              defaultValue={section.subtitleEn ?? ""}
              className="mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="subtitleNe">Subtitle (Nepali)</Label>
            <Input
              id="subtitleNe"
              name="subtitleNe"
              defaultValue={section.subtitleNe ?? ""}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="pageScope">Show on</Label>
            <Select
              id="pageScope"
              name="pageScope"
              defaultValue={section.pageScope}
              className="mt-1.5"
            >
              <option value="home">Home</option>
              <option value="story">Our story</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="layout">Layout</Label>
            <Select
              id="layout"
              name="layout"
              defaultValue={section.layout}
              className="mt-1.5"
            >
              <option value="full_bleed">Full width</option>
              <option value="split_left">Photo left, text right</option>
              <option value="split_right">Text left, photo right</option>
              <option value="grid_3">Three columns</option>
              <option value="carousel">Carousel</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="theme">Background</Label>
            <Select
              id="theme"
              name="theme"
              defaultValue={section.theme}
              className="mt-1.5"
            >
              <option value="light">Light</option>
              <option value="warm">Warm</option>
              <option value="dark">Dark</option>
              <option value="accent">Green accent</option>
            </Select>
          </div>
          <label className="mt-8 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isPublished"
              defaultChecked={section.isPublished}
              className="size-4 accent-brand-600"
            />
            Published — visible on the website
          </label>
        </div>
        <Button type="submit">Save title and layout</Button>
      </form>

      <h2 className="mb-1 font-display text-lg font-bold">Content</h2>
      <p className="mb-4 text-sm text-ink-soft">
        Click a block, change the words or photo, then save that block. Same
        idea as WordPress — no code.
      </p>

      <AddBlockBar sectionId={section.id} itemIds={items.map((i) => i.id)} />

      <ul className="mt-6 grid gap-5">
        {blocks.map((block, index) => (
          <li key={block.id}>
            <BlockCard
              block={block}
              sectionId={section.id}
              isFirst={index === 0}
              isLast={index === blocks.length - 1}
              media={media}
              items={items}
            />
          </li>
        ))}
      </ul>

      {blocks.length > 0 ? (
        <div className="mt-6">
          <AddBlockBar sectionId={section.id} itemIds={items.map((i) => i.id)} />
        </div>
      ) : (
        <p className="mt-6 rounded-card border border-dashed border-line p-8 text-center text-ink-soft">
          This section is empty. Add a text or photo block above.
        </p>
      )}

      <form action={deleteSection} className="mt-12">
        <input type="hidden" name="id" value={section.id} />
        <Button
          type="submit"
          variant="danger"
          onClick={(e) => {
            if (!confirm("Delete this whole section from the website?")) {
              e.preventDefault();
            }
          }}
        >
          Delete section
        </Button>
      </form>
    </div>
  );
}

function AddBlockBar({
  sectionId,
  itemIds,
}: {
  sectionId: string;
  itemIds: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-card border border-dashed border-line bg-paper p-3">
      <span className="mr-1 self-center text-xs font-semibold uppercase tracking-wide text-ink-faint">
        Add
      </span>
      {EASY_BLOCK_KINDS.map((kind) => {
        const Icon = BLOCK_ICONS[kind];
        return (
          <form key={kind} action={saveBlock}>
            <input type="hidden" name="sectionId" value={sectionId} />
            <input type="hidden" name="kind" value={kind} />
            <input
              type="hidden"
              name="payload"
              value={JSON.stringify(emptyBlockPayload(kind, { itemIds }))}
            />
            <Button type="submit" variant="outline" size="sm">
              <Icon className="size-3.5" />
              {BLOCK_LABELS[kind]}
            </Button>
          </form>
        );
      })}
    </div>
  );
}

function BlockCard({
  block,
  sectionId,
  isFirst,
  isLast,
  media,
  items,
}: {
  block: BlockRecord;
  sectionId: string;
  isFirst: boolean;
  isLast: boolean;
  media: LibraryMedia[];
  items: MenuChoice[];
}) {
  const kind = block.kind as BlockKind;
  const [payload, setPayload] = useState<unknown>(block.payload ?? {});
  const Icon = BLOCK_ICONS[kind] ?? Type;

  return (
    <article className="overflow-hidden rounded-card border border-line bg-paper">
      <header className="flex items-center gap-2 border-b border-line bg-cream/50 px-4 py-2.5">
        <Icon className="size-4 text-ink-faint" />
        <p className="text-sm font-semibold text-ink">
          {BLOCK_LABELS[kind] ?? block.kind}
        </p>
        <div className="ml-auto flex items-center gap-1">
          <form action={moveBlock}>
            <input type="hidden" name="id" value={block.id} />
            <input type="hidden" name="sectionId" value={sectionId} />
            <input type="hidden" name="direction" value="up" />
            <button
              type="submit"
              disabled={isFirst}
              className="focus-ring grid size-8 place-items-center rounded-full text-ink-faint hover:bg-paper disabled:opacity-30"
              aria-label="Move up"
            >
              <ChevronUp className="size-4" />
            </button>
          </form>
          <form action={moveBlock}>
            <input type="hidden" name="id" value={block.id} />
            <input type="hidden" name="sectionId" value={sectionId} />
            <input type="hidden" name="direction" value="down" />
            <button
              type="submit"
              disabled={isLast}
              className="focus-ring grid size-8 place-items-center rounded-full text-ink-faint hover:bg-paper disabled:opacity-30"
              aria-label="Move down"
            >
              <ChevronDown className="size-4" />
            </button>
          </form>
          <form action={deleteBlock}>
            <input type="hidden" name="id" value={block.id} />
            <button
              type="submit"
              className="focus-ring grid size-8 place-items-center rounded-full text-ink-faint hover:bg-chilli-soft hover:text-chilli"
              aria-label="Remove block"
              onClick={(e) => {
                if (!confirm("Remove this block?")) e.preventDefault();
              }}
            >
              <Trash2 className="size-4" />
            </button>
          </form>
        </div>
      </header>

      <form action={saveBlock} className="grid gap-4 p-4">
        <input type="hidden" name="id" value={block.id} />
        <input type="hidden" name="sectionId" value={sectionId} />
        <input type="hidden" name="kind" value={block.kind} />
        <input type="hidden" name="payload" value={JSON.stringify(payload)} />
        <BlockFields
          kind={kind}
          payload={payload}
          onChange={setPayload}
          media={media}
          items={items}
        />
        <div>
          <Button type="submit" size="sm">
            Save this block
          </Button>
        </div>
      </form>
    </article>
  );
}

function BlockFields({
  kind,
  payload,
  onChange,
  media,
  items,
}: {
  kind: BlockKind;
  payload: unknown;
  onChange: (next: unknown) => void;
  media: LibraryMedia[];
  items: MenuChoice[];
}) {
  const rec = asRecord(payload);

  const set = (patch: Record<string, unknown>) => onChange({ ...rec, ...patch });

  switch (kind) {
    case "rich_text":
      return (
        <>
          <Bilingual
            en="Heading (English)"
            ne="Heading (Nepali)"
            enName="headingEn"
            neName="headingNe"
            enValue={str(rec.headingEn)}
            neValue={str(rec.headingNe)}
            onEn={(headingEn) => set({ headingEn })}
            onNe={(headingNe) => set({ headingNe })}
          />
          <Bilingual
            area
            en="Text (English)"
            ne="Text (Nepali)"
            enName="bodyEn"
            neName="bodyNe"
            enValue={str(rec.bodyEn)}
            neValue={str(rec.bodyNe)}
            onEn={(bodyEn) => set({ bodyEn })}
            onNe={(bodyNe) => set({ bodyNe })}
          />
        </>
      );
    case "image":
      return (
        <>
          <MediaPickerField
            label="Photo"
            hint="Paste a link or pick one you already uploaded."
            value={mediaDraft(rec.media)}
            onChange={(next) => set({ media: next })}
            library={media}
          />
          <Bilingual
            en="Caption (English)"
            ne="Caption (Nepali)"
            enName="captionEn"
            neName="captionNe"
            enValue={str(rec.captionEn)}
            neValue={str(rec.captionNe)}
            onEn={(captionEn) => set({ captionEn })}
            onNe={(captionNe) => set({ captionNe })}
          />
        </>
      );
    case "gallery": {
      const galleryItems = Array.isArray(rec.items) ? rec.items : [];
      return (
        <div className="grid gap-4">
          {galleryItems.map((item, i) => (
            <div key={i} className="relative">
              <MediaPickerField
                label={`Photo ${i + 1}`}
                value={mediaDraft(item)}
                onChange={(next) =>
                  set({
                    items: galleryItems.map((row, n) => (n === i ? next : row)),
                  })
                }
                library={media}
              />
              {galleryItems.length > 1 ? (
                <button
                  type="button"
                  className="absolute right-3 top-3 text-sm text-chilli"
                  onClick={() =>
                    set({ items: galleryItems.filter((_, n) => n !== i) })
                  }
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              set({
                items: [...galleryItems, { url: "", altEn: "", altNe: "" }],
              })
            }
          >
            <Plus className="size-4" />
            Add another photo
          </Button>
        </div>
      );
    }
    case "video":
      return (
        <>
          <div>
            <Label>Video link</Label>
            <Input
              type="url"
              value={str(rec.url)}
              onChange={(e) => set({ url: e.target.value })}
              placeholder="https://…"
              className="mt-1.5"
            />
          </div>
          <MediaPickerField
            label="Poster photo (optional)"
            hint="Shown before the video plays."
            value={{
              url: str(rec.posterUrl),
              altEn: "",
              altNe: "",
            }}
            onChange={(next) => set({ posterUrl: next.url || null })}
            library={media}
          />
          <Bilingual
            en="Title (English)"
            ne="Title (Nepali)"
            enName="titleEn"
            neName="titleNe"
            enValue={str(rec.titleEn)}
            neValue={str(rec.titleNe)}
            onEn={(titleEn) => set({ titleEn })}
            onNe={(titleNe) => set({ titleNe })}
          />
        </>
      );
    case "quote":
      return (
        <>
          <Bilingual
            area
            en="Quote (English)"
            ne="Quote (Nepali)"
            enName="bodyEn"
            neName="bodyNe"
            enValue={str(rec.bodyEn)}
            neValue={str(rec.bodyNe)}
            onEn={(bodyEn) => set({ bodyEn })}
            onNe={(bodyNe) => set({ bodyNe })}
          />
          <div>
            <Label hint="optional">Who said it?</Label>
            <Input
              value={str(rec.attribution)}
              onChange={(e) => set({ attribution: e.target.value })}
              className="mt-1.5"
            />
          </div>
        </>
      );
    case "ingredient_story":
      return (
        <>
          <Bilingual
            en="Ingredient name (English)"
            ne="Ingredient name (Nepali)"
            enName="nameEn"
            neName="nameNe"
            enValue={str(rec.nameEn)}
            neValue={str(rec.nameNe)}
            onEn={(nameEn) => set({ nameEn })}
            onNe={(nameNe) => set({ nameNe })}
          />
          <Bilingual
            en="Where it comes from (English)"
            ne="Where it comes from (Nepali)"
            enName="sourceEn"
            neName="sourceNe"
            enValue={str(rec.sourceEn)}
            neValue={str(rec.sourceNe)}
            onEn={(sourceEn) => set({ sourceEn })}
            onNe={(sourceNe) => set({ sourceNe })}
          />
          <Bilingual
            area
            en="Story (English)"
            ne="Story (Nepali)"
            enName="bodyEn"
            neName="bodyNe"
            enValue={str(rec.bodyEn)}
            neValue={str(rec.bodyNe)}
            onEn={(bodyEn) => set({ bodyEn })}
            onNe={(bodyNe) => set({ bodyNe })}
          />
          <MediaPickerField
            label="Photo (optional)"
            value={mediaDraft(rec.media)}
            onChange={(next) =>
              set({ media: next.url ? next : null })
            }
            library={media}
          />
        </>
      );
    case "stat_strip": {
      const stats = Array.isArray(rec.stats) ? rec.stats : [];
      return (
        <div className="grid gap-3">
          {stats.map((stat, i) => {
            const row = asRecord(stat);
            return (
              <div
                key={i}
                className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-[6rem_1fr_1fr_auto]"
              >
                <div>
                  <Label>Number</Label>
                  <Input
                    value={str(row.value)}
                    onChange={(e) =>
                      set({
                        stats: stats.map((s, n) =>
                          n === i ? { ...asRecord(s), value: e.target.value } : s,
                        ),
                      })
                    }
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Label (English)</Label>
                  <Input
                    value={str(row.labelEn)}
                    onChange={(e) =>
                      set({
                        stats: stats.map((s, n) =>
                          n === i
                            ? { ...asRecord(s), labelEn: e.target.value }
                            : s,
                        ),
                      })
                    }
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Label (Nepali)</Label>
                  <Input
                    value={str(row.labelNe)}
                    onChange={(e) =>
                      set({
                        stats: stats.map((s, n) =>
                          n === i
                            ? { ...asRecord(s), labelNe: e.target.value }
                            : s,
                        ),
                      })
                    }
                    className="mt-1.5"
                  />
                </div>
                <button
                  type="button"
                  className="self-end pb-2 text-sm text-chilli"
                  onClick={() =>
                    set({ stats: stats.filter((_, n) => n !== i) })
                  }
                >
                  Remove
                </button>
              </div>
            );
          })}
          {stats.length < 4 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                set({
                  stats: [...stats, { value: "", labelEn: "", labelNe: "" }],
                })
              }
            >
              <Plus className="size-4" />
              Add a number
            </Button>
          ) : null}
        </div>
      );
    }
    case "steps": {
      const steps = Array.isArray(rec.steps) ? rec.steps : [];
      return (
        <div className="grid gap-4">
          {steps.map((step, i) => {
            const row = asRecord(step);
            return (
              <div key={i} className="grid gap-3 rounded-xl border border-line p-4">
                <p className="text-xs font-semibold uppercase text-ink-faint">
                  Step {i + 1}
                </p>
                <Bilingual
                  en="Title (English)"
                  ne="Title (Nepali)"
                  enName={`step-title-${i}`}
                  neName={`step-title-ne-${i}`}
                  enValue={str(row.titleEn)}
                  neValue={str(row.titleNe)}
                  onEn={(titleEn) =>
                    set({
                      steps: steps.map((s, n) =>
                        n === i ? { ...asRecord(s), titleEn } : s,
                      ),
                    })
                  }
                  onNe={(titleNe) =>
                    set({
                      steps: steps.map((s, n) =>
                        n === i ? { ...asRecord(s), titleNe } : s,
                      ),
                    })
                  }
                />
                <Bilingual
                  area
                  en="Details (English)"
                  ne="Details (Nepali)"
                  enName={`step-body-${i}`}
                  neName={`step-body-ne-${i}`}
                  enValue={str(row.bodyEn)}
                  neValue={str(row.bodyNe)}
                  onEn={(bodyEn) =>
                    set({
                      steps: steps.map((s, n) =>
                        n === i ? { ...asRecord(s), bodyEn } : s,
                      ),
                    })
                  }
                  onNe={(bodyNe) =>
                    set({
                      steps: steps.map((s, n) =>
                        n === i ? { ...asRecord(s), bodyNe } : s,
                      ),
                    })
                  }
                />
                <MediaPickerField
                  label="Photo for this step (optional)"
                  value={mediaDraft(row.media)}
                  onChange={(next) =>
                    set({
                      steps: steps.map((s, n) =>
                        n === i
                          ? { ...asRecord(s), media: next.url ? next : null }
                          : s,
                      ),
                    })
                  }
                  library={media}
                />
                {steps.length > 1 ? (
                  <button
                    type="button"
                    className="justify-self-start text-sm text-chilli"
                    onClick={() =>
                      set({ steps: steps.filter((_, n) => n !== i) })
                    }
                  >
                    Remove step
                  </button>
                ) : null}
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              set({
                steps: [
                  ...steps,
                  { titleEn: "", titleNe: "", bodyEn: "", bodyNe: "" },
                ],
              })
            }
          >
            <Plus className="size-4" />
            Add a step
          </Button>
        </div>
      );
    }
    case "faq": {
      const entries = Array.isArray(rec.entries) ? rec.entries : [];
      return (
        <div className="grid gap-4">
          {entries.map((entry, i) => {
            const row = asRecord(entry);
            return (
              <div key={i} className="grid gap-3 rounded-xl border border-line p-4">
                <Bilingual
                  en="Question (English)"
                  ne="Question (Nepali)"
                  enName={`q-${i}`}
                  neName={`q-ne-${i}`}
                  enValue={str(row.questionEn)}
                  neValue={str(row.questionNe)}
                  onEn={(questionEn) =>
                    set({
                      entries: entries.map((s, n) =>
                        n === i ? { ...asRecord(s), questionEn } : s,
                      ),
                    })
                  }
                  onNe={(questionNe) =>
                    set({
                      entries: entries.map((s, n) =>
                        n === i ? { ...asRecord(s), questionNe } : s,
                      ),
                    })
                  }
                />
                <Bilingual
                  area
                  en="Answer (English)"
                  ne="Answer (Nepali)"
                  enName={`a-${i}`}
                  neName={`a-ne-${i}`}
                  enValue={str(row.answerEn)}
                  neValue={str(row.answerNe)}
                  onEn={(answerEn) =>
                    set({
                      entries: entries.map((s, n) =>
                        n === i ? { ...asRecord(s), answerEn } : s,
                      ),
                    })
                  }
                  onNe={(answerNe) =>
                    set({
                      entries: entries.map((s, n) =>
                        n === i ? { ...asRecord(s), answerNe } : s,
                      ),
                    })
                  }
                />
                {entries.length > 1 ? (
                  <button
                    type="button"
                    className="justify-self-start text-sm text-chilli"
                    onClick={() =>
                      set({ entries: entries.filter((_, n) => n !== i) })
                    }
                  >
                    Remove question
                  </button>
                ) : null}
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              set({
                entries: [
                  ...entries,
                  {
                    questionEn: "",
                    questionNe: "",
                    answerEn: "",
                    answerNe: "",
                  },
                ],
              })
            }
          >
            <Plus className="size-4" />
            Add a question
          </Button>
        </div>
      );
    }
    case "item_carousel": {
      const selected = new Set(
        Array.isArray(rec.itemIds) ? rec.itemIds.map(String) : [],
      );
      return (
        <ul className="grid gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <label className="flex items-center gap-3 rounded-xl border border-line px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(item.id);
                    else next.delete(item.id);
                    set({ itemIds: [...next] });
                  }}
                  className="size-4 accent-brand-600"
                />
                {item.nameEn}
              </label>
            </li>
          ))}
        </ul>
      );
    }
    default:
      return (
        <p className="text-sm text-ink-soft">
          This block type cannot be edited here yet.
        </p>
      );
  }
}

function Bilingual({
  en,
  ne,
  enName,
  neName,
  enValue,
  neValue,
  onEn,
  onNe,
  area,
}: {
  en: string;
  ne: string;
  enName: string;
  neName: string;
  enValue: string;
  neValue: string;
  onEn: (v: string) => void;
  onNe: (v: string) => void;
  area?: boolean;
}) {
  const Field = area ? Textarea : Input;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label htmlFor={enName}>{en}</Label>
        <Field
          id={enName}
          value={enValue}
          onChange={(e) => onEn(e.target.value)}
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor={neName} hint="optional">
          {ne}
        </Label>
        <Field
          id={neName}
          value={neValue}
          onChange={(e) => onNe(e.target.value)}
          className="mt-1.5"
        />
      </div>
    </div>
  );
}

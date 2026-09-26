"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

export type LibraryMedia = {
  id: string;
  kind: string;
  url: string | null;
  altEn: string | null;
  altNe: string | null;
};

export type MediaDraft = {
  mediaId?: string;
  url: string;
  altEn: string;
  altNe: string;
};

export function MediaPickerField({
  label,
  hint,
  value,
  onChange,
  library,
  accept = "image",
}: {
  label: string;
  hint?: string;
  value: MediaDraft;
  onChange: (next: MediaDraft) => void;
  library: LibraryMedia[];
  accept?: "image" | "video" | "any";
}) {
  const [open, setOpen] = useState(false);
  const items = library.filter((m) => {
    if (!m.url) return false;
    if (accept === "any") return true;
    return m.kind === accept;
  });
  const preview = value.url.trim();
  const isImage =
    accept !== "video" &&
    preview.length > 0 &&
    !preview.match(/\.(mp4|webm|mov)(\?|$)/i);

  return (
    <div className="grid gap-3 rounded-xl border border-line bg-cream/40 p-4">
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-ink-faint">{hint}</p> : null}
      </div>

      {isImage ? (
        <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-line">
          <Image
            src={preview}
            alt={value.altEn || label}
            fill
            unoptimized
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 640px"
          />
        </div>
      ) : preview ? (
        <div className="flex items-center gap-2 rounded-xl bg-paper px-3 py-2 text-sm text-ink-soft">
          <ImageIcon className="size-4 shrink-0" />
          <span className="truncate">{preview}</span>
        </div>
      ) : (
        <div className="grid aspect-[16/9] place-items-center rounded-xl border border-dashed border-line text-sm text-ink-faint">
          No photo yet
        </div>
      )}

      <div>
        <Label>Photo or video link</Label>
        <Input
          type="url"
          value={value.url}
          onChange={(e) =>
            onChange({ ...value, url: e.target.value, mediaId: undefined })
          }
          placeholder="https://…"
          className="mt-1.5"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label hint="shown if the photo cannot load">
            What is in the photo? (English)
          </Label>
          <Input
            value={value.altEn}
            onChange={(e) => onChange({ ...value, altEn: e.target.value })}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label hint="optional">What is in the photo? (Nepali)</Label>
          <Input
            value={value.altNe}
            onChange={(e) => onChange({ ...value, altNe: e.target.value })}
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide library" : "Pick from library"}
        </Button>
        {value.url ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({ url: "", altEn: "", altNe: "", mediaId: undefined })
            }
          >
            Remove photo
          </Button>
        ) : null}
      </div>

      {open ? (
        items.length === 0 ? (
          <p className="text-sm text-ink-soft">
            The media library is empty. Paste a link above, or add photos under
            Media first.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange({
                      mediaId: item.id,
                      url: item.url ?? "",
                      altEn: item.altEn ?? "",
                      altNe: item.altNe ?? "",
                    });
                    setOpen(false);
                  }}
                  className="focus-ring group overflow-hidden rounded-lg border border-line bg-paper"
                >
                  {item.kind === "image" && item.url ? (
                    <span className="relative block aspect-square">
                      <Image
                        src={item.url}
                        alt={item.altEn ?? ""}
                        fill
                        unoptimized
                        className="object-cover group-hover:opacity-90"
                        sizes="120px"
                      />
                    </span>
                  ) : (
                    <span className="grid aspect-square place-items-center text-xs text-ink-faint">
                      Video
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}

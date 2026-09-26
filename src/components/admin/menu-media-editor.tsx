"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Film, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Label } from "@/components/ui/field";
import { MENU_MEDIA_MAX_BYTES } from "@/lib/media/limits";
import {
  removeMenuMedia,
  setMenuHighlight,
  uploadMenuMedia,
} from "@/server/actions/menu-media";
import type { DishMedia } from "@/server/queries/admin-menu";

function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);
}

export function MenuMediaEditor({
  itemId,
  media,
}: {
  itemId: string;
  media: DishMedia[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function onPick(list: FileList | null) {
    const files = list ? [...list] : [];
    if (files.length === 0) return;
    setError(undefined);
    startTransition(async () => {
      for (const file of files) {
        if (file.size > MENU_MEDIA_MAX_BYTES) {
          setError(
            isVideoFile(file)
              ? `${file.name} is over 15 MB. Videos must be 15 MB or smaller.`
              : `${file.name} is over 15 MB.`,
          );
          break;
        }
        const body = new FormData();
        body.set("itemId", itemId);
        body.set("file", file);
        const result = await uploadMenuMedia(body);
        if (result.error) {
          setError(result.error);
          break;
        }
      }
      router.refresh();
    });
  }

  return (
    <section className="grid gap-4 rounded-card border border-line bg-paper p-5">
      <div>
        <h2 className="font-display text-lg font-bold">Photos & video</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Choose which one shows first. The rest rotate on the menu and on the
          dish page. Videos must be 15 MB or smaller. Files are compressed
          after they upload.
        </p>
      </div>

      {media.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {media.map((item) => (
            <li
              key={item.id}
              className="overflow-hidden rounded-xl border border-line"
            >
              <div className="relative aspect-[4/3] bg-line">
                {item.kind === "video" && item.url ? (
                  <video
                    src={item.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="size-full object-cover"
                  />
                ) : item.url ? (
                  <Image
                    src={item.url}
                    alt=""
                    fill
                    unoptimized={item.url.startsWith("/")}
                    className="object-cover"
                    sizes="320px"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-ink-faint">
                    <Film className="size-6" aria-hidden />
                  </div>
                )}
                {item.isHighlight ? (
                  <span className="absolute left-2 top-2 rounded-pill bg-ink px-2 py-1 text-[11px] font-semibold text-cream">
                    Shows first
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-2 p-2">
                {item.isHighlight ? (
                  <span className="px-2 text-xs font-medium text-ink-soft">
                    Highlight
                  </span>
                ) : (
                  <form action={setMenuHighlight}>
                    <input type="hidden" name="itemId" value={itemId} />
                    <input type="hidden" name="mediaId" value={item.id} />
                    <Button type="submit" variant="outline" size="sm">
                      Show this first
                    </Button>
                  </form>
                )}
                <form action={removeMenuMedia}>
                  <input type="hidden" name="itemId" value={itemId} />
                  <input type="hidden" name="mediaId" value={item.id} />
                  <button
                    type="submit"
                    aria-label="Remove media"
                    className="focus-ring grid size-9 place-items-center rounded-full text-ink-faint hover:bg-chilli-soft hover:text-chilli"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid aspect-[16/9] place-items-center rounded-xl border border-dashed border-line text-sm text-ink-faint">
          No photos or video yet
        </div>
      )}

      <div>
        <Label htmlFor="menu-media">Add photos or video</Label>
        <input
          id="menu-media"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime,.jpg,.jpeg,.png,.webp,.heic,.mp4,.webm,.mov"
          multiple
          disabled={pending}
          className="focus-ring mt-1.5 block w-full text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700"
          onChange={(e) => {
            onPick(e.target.files);
            e.target.value = "";
          }}
        />
        <p className="mt-1.5 text-xs text-ink-faint">
          {pending ? "Uploading…" : "JPG, PNG, WebP, HEIC, MP4, WebM, or MOV."}
        </p>
        <FieldError>{error}</FieldError>
      </div>
    </section>
  );
}

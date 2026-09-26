"use server";

import { createHash } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, asc, eq, isNull, max } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { MENU_MEDIA_MAX_BYTES } from "@/lib/media/limits";
import { publishMenu } from "@/server/cache";
import { text } from "@/server/form";

export type MediaActionState = { error?: string };

const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heic",
};

const VIDEO_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

function classify(file: File): { kind: "image" | "video"; ext: string } | null {
  if (IMAGE_EXT[file.type]) return { kind: "image", ext: IMAGE_EXT[file.type] };
  if (VIDEO_EXT[file.type]) return { kind: "video", ext: VIDEO_EXT[file.type] };
  const name = file.name.toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return { kind: "image", ext: "jpg" };
  if (name.endsWith(".png")) return { kind: "image", ext: "png" };
  if (name.endsWith(".webp")) return { kind: "image", ext: "webp" };
  if (name.endsWith(".heic") || name.endsWith(".heif")) return { kind: "image", ext: "heic" };
  if (name.endsWith(".mp4")) return { kind: "video", ext: "mp4" };
  if (name.endsWith(".webm")) return { kind: "video", ext: "webm" };
  if (name.endsWith(".mov")) return { kind: "video", ext: "mov" };
  return null;
}

async function refreshItem(itemId: string) {
  revalidatePath(`/admin/menu/${itemId}`);
  await publishMenu();
}

export async function uploadMenuMedia(form: FormData): Promise<MediaActionState> {
  const session = await requireAdmin("manager");
  const itemId = text(form, "itemId");
  if (!z.uuid().safeParse(itemId).success) return { error: "Save the dish first." };

  const [item] = await db
    .select({ id: s.menuItems.id, heroMediaId: s.menuItems.heroMediaId, nameEn: s.menuItems.nameEn, nameNe: s.menuItems.nameNe })
    .from(s.menuItems)
    .where(and(eq(s.menuItems.id, itemId), isNull(s.menuItems.deletedAt)))
    .limit(1);
  if (!item) return { error: "That dish is no longer on the menu." };

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo or video." };
  }

  const classified = classify(file);
  if (!classified) {
    return { error: "Use a JPG, PNG, WebP, HEIC, MP4, WebM, or MOV file." };
  }
  if (file.size > MENU_MEDIA_MAX_BYTES) {
    return {
      error:
        classified.kind === "video"
          ? "Videos must be 15 MB or smaller."
          : "Photos must be 15 MB or smaller.",
    };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = `${nanoid()}.${classified.ext}`;
  const key = `/uploads/menu/${itemId}/${filename}`;
  const dir = path.join(process.cwd(), "public", "uploads", "menu", itemId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), bytes);

  let mediaId = "";
  try {
    mediaId = await db.transaction(async (tx) => {
      if (item.heroMediaId) {
        const [linked] = await tx
          .select({ mediaId: s.itemMedia.mediaId })
          .from(s.itemMedia)
          .where(
            and(
              eq(s.itemMedia.itemId, itemId),
              eq(s.itemMedia.mediaId, item.heroMediaId),
            ),
          )
          .limit(1);
        if (!linked) {
          await tx.insert(s.itemMedia).values({
            itemId,
            mediaId: item.heroMediaId,
            role: "gallery",
            sortOrder: 0,
          });
        }
      }

      const [top] = await tx
        .select({ value: max(s.itemMedia.sortOrder) })
        .from(s.itemMedia)
        .where(eq(s.itemMedia.itemId, itemId));

      const [created] = await tx
        .insert(s.media)
        .values({
          kind: classified.kind,
          r2Key: key,
          mime: file.type || (classified.kind === "video" ? "video/mp4" : "image/jpeg"),
          bytes: bytes.length,
          altEn: item.nameEn,
          altNe: item.nameNe,
          fileHash: createHash("sha256").update(bytes).digest("hex"),
          uploadedBy: session.userId,
        })
        .returning();

      await tx.insert(s.itemMedia).values({
        itemId,
        mediaId: created.id,
        role: "gallery",
        sortOrder: (top?.value ?? -1) + 1,
      });

      if (!item.heroMediaId) {
        await tx
          .update(s.menuItems)
          .set({ heroMediaId: created.id, updatedAt: new Date() })
          .where(eq(s.menuItems.id, itemId));
      }

      return created.id;
    });
  } catch (err) {
    await unlink(path.join(dir, filename)).catch(() => {});
    throw err;
  }

  after(async () => {
    try {
      const { compressStoredMedia } = await import("@/lib/media/compress");
      await compressStoredMedia(mediaId);
    } catch (err) {
      console.error("menu media compression failed", err);
    }
  });

  await refreshItem(itemId);
  return {};
}

export async function setMenuHighlight(form: FormData) {
  await requireAdmin("manager");
  const itemId = text(form, "itemId");
  const mediaId = text(form, "mediaId");
  if (!z.uuid().safeParse(itemId).success || !z.uuid().safeParse(mediaId).success) {
    return;
  }

  const [link] = await db
    .select({ mediaId: s.itemMedia.mediaId })
    .from(s.itemMedia)
    .where(and(eq(s.itemMedia.itemId, itemId), eq(s.itemMedia.mediaId, mediaId)))
    .limit(1);
  const [hero] = await db
    .select({ heroMediaId: s.menuItems.heroMediaId })
    .from(s.menuItems)
    .where(eq(s.menuItems.id, itemId))
    .limit(1);
  if (!link && hero?.heroMediaId !== mediaId) return;

  await db
    .update(s.menuItems)
    .set({ heroMediaId: mediaId, updatedAt: new Date() })
    .where(eq(s.menuItems.id, itemId));
  await refreshItem(itemId);
}

export async function removeMenuMedia(form: FormData) {
  await requireAdmin("manager");
  const itemId = text(form, "itemId");
  const mediaId = text(form, "mediaId");
  if (!z.uuid().safeParse(itemId).success || !z.uuid().safeParse(mediaId).success) {
    return;
  }

  const [media] = await db
    .select()
    .from(s.media)
    .where(eq(s.media.id, mediaId))
    .limit(1);

  await db
    .delete(s.itemMedia)
    .where(and(eq(s.itemMedia.itemId, itemId), eq(s.itemMedia.mediaId, mediaId)));

  const [item] = await db
    .select({ heroMediaId: s.menuItems.heroMediaId })
    .from(s.menuItems)
    .where(eq(s.menuItems.id, itemId))
    .limit(1);

  if (item?.heroMediaId === mediaId) {
    const [next] = await db
      .select({ mediaId: s.itemMedia.mediaId })
      .from(s.itemMedia)
      .where(eq(s.itemMedia.itemId, itemId))
      .orderBy(asc(s.itemMedia.sortOrder))
      .limit(1);
    await db
      .update(s.menuItems)
      .set({ heroMediaId: next?.mediaId ?? null, updatedAt: new Date() })
      .where(eq(s.menuItems.id, itemId));
  }

  const [stillLinked] = await db
    .select({ mediaId: s.itemMedia.mediaId })
    .from(s.itemMedia)
    .where(eq(s.itemMedia.mediaId, mediaId))
    .limit(1);
  const [stillHero] = await db
    .select({ id: s.menuItems.id })
    .from(s.menuItems)
    .where(eq(s.menuItems.heroMediaId, mediaId))
    .limit(1);

  if (!stillLinked && !stillHero && media?.r2Key.startsWith("/uploads/menu/")) {
    const relative = media.r2Key.replace(/^\/+/, "");
    await unlink(path.join(process.cwd(), "public", relative)).catch(() => {});
    await db.delete(s.media).where(eq(s.media.id, mediaId));
  }

  await refreshItem(itemId);
}

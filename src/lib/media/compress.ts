import "server-only";

import { spawn } from "node:child_process";
import { readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import {
  isLocalMenuKey,
  isObjectMenuKey,
  materializeMenuFile,
  replaceMenuFile,
} from "@/lib/media/storage";
import { publishMenu } from "@/server/cache";

function run(bin: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      err = (err + chunk.toString()).slice(-1500);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err || `ffmpeg exited ${code}`));
    });
  });
}

async function keepSmaller(opts: {
  mediaId: string;
  rowKey: string;
  currentPath: string;
  candidatePath: string;
  nextPath: string;
  nextKey: string;
  mime: string;
  width?: number | null;
  height?: number | null;
  cleanup?: () => Promise<void>;
}) {
  const [before, afterStat] = await Promise.all([
    stat(opts.currentPath),
    stat(opts.candidatePath),
  ]);
  if (afterStat.size >= before.size) {
    await unlink(opts.candidatePath).catch(() => {});
    await opts.cleanup?.();
    return;
  }

  const candidateBytes = await readFile(opts.candidatePath);

  if (isObjectMenuKey(opts.rowKey)) {
    await replaceMenuFile(opts.rowKey, opts.nextKey, candidateBytes, opts.mime);
    await unlink(opts.candidatePath).catch(() => {});
    await opts.cleanup?.();
  } else if (isLocalMenuKey(opts.rowKey)) {
    if (opts.candidatePath !== opts.nextPath) {
      await rename(opts.candidatePath, opts.nextPath);
    }
    if (opts.nextPath !== opts.currentPath) {
      await unlink(opts.currentPath).catch(() => {});
    }
  } else {
    await opts.cleanup?.();
    return;
  }

  await db
    .update(s.media)
    .set({
      r2Key: opts.nextKey,
      mime: opts.mime,
      bytes: afterStat.size,
      width: opts.width ?? null,
      height: opts.height ?? null,
    })
    .where(eq(s.media.id, opts.mediaId));

  await publishMenu();
}

/**
 * Shrink a menu upload after the admin already has it on screen. A failure
 * leaves the original file in place — the 15 MB cap already bounded it.
 */
export async function compressStoredMedia(mediaId: string): Promise<void> {
  const [row] = await db
    .select()
    .from(s.media)
    .where(eq(s.media.id, mediaId))
    .limit(1);
  if (!row) return;

  const materialized = await materializeMenuFile(row.r2Key);
  if (!materialized) return;

  const { path: currentPath, cleanup } = materialized;

  try {
    if (row.kind === "image") {
      const input = await readFile(currentPath);
      const { data, info } = await sharp(input, { failOn: "none" })
        .rotate()
        .resize({
          width: 1200,
          height: 1200,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 75 })
        .toBuffer({ resolveWithObject: true });

      const nextPath = currentPath.replace(/\.[^.]+$/, "") + ".webp";
      const nextKey = row.r2Key.replace(/\.[^.]+$/, "") + ".webp";
      const temp = `${nextPath}.tmp`;
      await writeFile(temp, data);
      await keepSmaller({
        mediaId,
        rowKey: row.r2Key,
        currentPath,
        candidatePath: temp,
        nextPath,
        nextKey,
        mime: "image/webp",
        width: info.width,
        height: info.height,
        cleanup,
      });
      return;
    }

    if (row.kind !== "video" || !ffmpegPath) return;

    const nextPath = currentPath.replace(/\.[^.]+$/, "") + ".mp4";
    const nextKey = row.r2Key.replace(/\.[^.]+$/, "") + ".mp4";
    const temp = `${nextPath}.compressing.mp4`;
    await run(ffmpegPath, [
      "-y",
      "-i",
      currentPath,
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-vf",
      "scale='min(1280,iw)':-2",
      "-c:v",
      "libx264",
      "-crf",
      "28",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-c:a",
      "aac",
      "-b:a",
      "96k",
      temp,
    ]);
    await keepSmaller({
      mediaId,
      rowKey: row.r2Key,
      currentPath,
      candidatePath: temp,
      nextPath,
      nextKey,
      mime: "video/mp4",
      cleanup,
    });
  } finally {
    if (isObjectMenuKey(row.r2Key)) {
      await cleanup?.();
    }
  }
}

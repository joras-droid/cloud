import "server-only";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env, hasS3 } from "@/env";

const LOCAL_MENU_PREFIX = "/uploads/menu/";
const OBJECT_MENU_PREFIX = "menu/";

let s3: S3Client | null = null;

function client(): S3Client {
  if (!hasS3) throw new Error("S3 is not configured");
  s3 ??= new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  return s3;
}

export function s3PublicBaseUrl(): string {
  if (env.AWS_S3_PUBLIC_BASE_URL) {
    return env.AWS_S3_PUBLIC_BASE_URL.replace(/\/$/, "");
  }
  return `https://${env.AWS_S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com`;
}

/** Object key in S3 (no leading slash). */
export function menuObjectKey(itemId: string, filename: string): string {
  return `${OBJECT_MENU_PREFIX}${itemId}/${filename}`;
}

export function isLocalMenuKey(key: string): boolean {
  return key.startsWith(LOCAL_MENU_PREFIX);
}

export function isObjectMenuKey(key: string): boolean {
  return key.startsWith(OBJECT_MENU_PREFIX) && !key.includes("..");
}

export function isManagedMenuKey(key: string): boolean {
  return isLocalMenuKey(key) || isObjectMenuKey(key);
}

function localMenuPath(key: string): string | null {
  if (!isLocalMenuKey(key) || key.includes("..")) return null;
  const root = path.resolve(process.cwd(), "public", "uploads", "menu");
  const full = path.resolve(process.cwd(), "public", key.slice(1));
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  const withTransform = body as {
    transformToByteArray?: () => Promise<Uint8Array>;
  };
  if (typeof withTransform.transformToByteArray === "function") {
    return Buffer.from(await withTransform.transformToByteArray());
  }
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function putMenuBytes(
  key: string,
  bytes: Buffer,
  contentType: string,
): Promise<void> {
  if (isObjectMenuKey(key)) {
    await client().send(
      new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET_NAME,
        Key: key,
        Body: bytes,
        ContentType: contentType,
      }),
    );
    return;
  }

  const full = localMenuPath(key);
  if (!full) throw new Error("Invalid menu media path");
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes);
}

export async function deleteMenuObject(key: string): Promise<void> {
  if (isObjectMenuKey(key)) {
    await client().send(
      new DeleteObjectCommand({
        Bucket: env.AWS_S3_BUCKET_NAME,
        Key: key,
      }),
    );
    return;
  }
  const full = localMenuPath(key);
  if (full) await unlink(full).catch(() => {});
}

/**
 * Returns a filesystem path suitable for ffmpeg/sharp. S3 objects are copied
 * to a temp file; call `cleanup` when finished.
 */
export async function materializeMenuFile(
  key: string,
): Promise<{ path: string; cleanup?: () => Promise<void> } | null> {
  const local = localMenuPath(key);
  if (local) return { path: local };

  if (!isObjectMenuKey(key)) return null;

  const res = await client().send(
    new GetObjectCommand({
      Bucket: env.AWS_S3_BUCKET_NAME,
      Key: key,
    }),
  );
  const bytes = await bodyToBuffer(res.Body);
  const temp = path.join(
    os.tmpdir(),
    `gks-media-${path.basename(key).replace(/[^a-zA-Z0-9._-]/g, "_")}`,
  );
  await writeFile(temp, bytes);
  return {
    path: temp,
    cleanup: () => unlink(temp).catch(() => {}),
  };
}

/** Used when compression renames a file on disk (local only). */
export async function replaceMenuFile(
  oldKey: string,
  newKey: string,
  bytes: Buffer,
  contentType: string,
): Promise<void> {
  if (isObjectMenuKey(oldKey) || isObjectMenuKey(newKey)) {
    await putMenuBytes(newKey, bytes, contentType);
    if (oldKey !== newKey) await deleteMenuObject(oldKey);
    return;
  }

  const oldPath = localMenuPath(oldKey);
  const newPath = localMenuPath(newKey);
  if (!oldPath || !newPath) throw new Error("Invalid menu media path");
  await mkdir(path.dirname(newPath), { recursive: true });
  await writeFile(newPath, bytes);
  if (newPath !== oldPath) await unlink(oldPath).catch(() => {});
}

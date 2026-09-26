"use server";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { parseBlock } from "@/lib/blocks/schemas";
import { isQrMethod, type QrMethodName } from "@/lib/payment-methods";
import { slugify } from "@/lib/utils";
import { requireAdmin } from "@/lib/auth/session";
import { writeAudit } from "@/server/audit";
import { publishSections, publishSettings } from "@/server/cache";
import { flag, optional, rupeesField, text } from "@/server/form";
import type { QrMethod } from "@/server/queries/settings";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function mediaOrNull(value: unknown): unknown {
  const rec = asRecord(value);
  return typeof rec.url === "string" && rec.url.trim() ? rec : null;
}

/** Drop empty extra rows so a cook can leave a blank slot without a hard fail. */
function sanitizeBlockPayload(kind: string, payload: unknown): unknown {
  const rec = asRecord(payload);
  if (kind === "gallery" && Array.isArray(rec.items)) {
    return {
      ...rec,
      items: rec.items.filter((item) => mediaOrNull(item)),
    };
  }
  if (kind === "ingredient_story") {
    return { ...rec, media: mediaOrNull(rec.media) };
  }
  if (kind === "video") {
    return {
      ...rec,
      posterUrl:
        typeof rec.posterUrl === "string" && rec.posterUrl.trim()
          ? rec.posterUrl
          : null,
    };
  }
  if (kind === "stat_strip" && Array.isArray(rec.stats)) {
    return {
      ...rec,
      stats: rec.stats.filter((stat) => {
        const row = asRecord(stat);
        return String(row.value ?? "").trim() && String(row.labelEn ?? "").trim();
      }),
    };
  }
  if (kind === "steps" && Array.isArray(rec.steps)) {
    return {
      ...rec,
      steps: rec.steps
        .map((step) => {
          const row = asRecord(step);
          return { ...row, media: mediaOrNull(row.media) };
        })
        .filter((step) => String(asRecord(step).titleEn ?? "").trim()),
    };
  }
  if (kind === "faq" && Array.isArray(rec.entries)) {
    return {
      ...rec,
      entries: rec.entries.filter((entry) => {
        const row = asRecord(entry);
        return (
          String(row.questionEn ?? "").trim() &&
          String(row.answerEn ?? "").trim()
        );
      }),
    };
  }
  return rec;
}

export async function saveSection(form: FormData) {
  const session = await requireAdmin("manager");
  const id = optional(form, "id");
  const titleEn = text(form, "titleEn");
  if (!titleEn) throw new Error("English title is required");

  const values = {
    slug: slugify(text(form, "slug") || titleEn),
    titleEn,
    titleNe: optional(form, "titleNe"),
    subtitleEn: optional(form, "subtitleEn"),
    subtitleNe: optional(form, "subtitleNe"),
    layout: z
      .enum(["full_bleed", "split_left", "split_right", "grid_3", "carousel"])
      .parse(text(form, "layout") || "full_bleed"),
    theme: z
      .enum(["light", "warm", "dark", "accent"])
      .parse(text(form, "theme") || "light"),
    pageScope: z
      .enum(["home", "story", "item"])
      .parse(text(form, "pageScope") || "home"),
    sortOrder: Number(text(form, "sortOrder") || 0),
    isPublished: flag(form, "isPublished"),
    publishedAt: flag(form, "isPublished") ? new Date() : null,
    updatedAt: new Date(),
  };

  let savedId = id;
  if (savedId) {
    await db.update(s.sections).set(values).where(eq(s.sections.id, savedId));
  } else {
    const [created] = await db.insert(s.sections).values(values).returning();
    savedId = created.id;
  }

  await writeAudit({
    actorId: session.userId,
    entity: "section",
    entityId: savedId,
    action: id ? "updated" : "created",
  });
  await publishSections();
  redirect(`/admin/sections/${savedId}`);
}

export async function saveBlock(form: FormData) {
  await requireAdmin("manager");
  const sectionId = text(form, "sectionId");
  const kind = text(form, "kind");
  const raw = optional(form, "payload") ?? "{}";
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error("Could not save this block. Try again.");
  }
  payload = sanitizeBlockPayload(kind, payload);
  const parsed = parseBlock(kind, payload);
  if (!parsed) {
    throw new Error(
      "Fill in the required text — and a photo link for photo blocks — then save again.",
    );
  }

  const id = optional(form, "id");
  if (id) {
    await db
      .update(s.blocks)
      .set({ kind: parsed.kind, payload: parsed.payload })
      .where(eq(s.blocks.id, id));
  } else {
    const existing = await db
      .select({ n: s.blocks.sortOrder })
      .from(s.blocks)
      .where(eq(s.blocks.sectionId, sectionId));
    const next = existing.reduce((max, row) => Math.max(max, row.n), -1) + 1;
    await db.insert(s.blocks).values({
      sectionId,
      kind: parsed.kind,
      payload: parsed.payload,
      sortOrder: next,
    });
  }
  await publishSections();
}

export async function moveBlock(form: FormData) {
  await requireAdmin("manager");
  const id = text(form, "id");
  const sectionId = text(form, "sectionId");
  const direction = text(form, "direction") === "up" ? "up" : "down";

  const rows = await db
    .select({ id: s.blocks.id, sortOrder: s.blocks.sortOrder })
    .from(s.blocks)
    .where(eq(s.blocks.sectionId, sectionId))
    .orderBy(asc(s.blocks.sortOrder));

  const i = rows.findIndex((row) => row.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return;

  const a = rows[i];
  const b = rows[j];
  await db.transaction(async (tx) => {
    await tx
      .update(s.blocks)
      .set({ sortOrder: b.sortOrder })
      .where(eq(s.blocks.id, a.id));
    await tx
      .update(s.blocks)
      .set({ sortOrder: a.sortOrder })
      .where(eq(s.blocks.id, b.id));
  });
  await publishSections();
}

export async function deleteBlock(form: FormData) {
  await requireAdmin("manager");
  await db.delete(s.blocks).where(eq(s.blocks.id, text(form, "id")));
  await publishSections();
}

export async function deleteSection(form: FormData) {
  await requireAdmin("manager");
  const id = text(form, "id");
  await db.delete(s.blocks).where(eq(s.blocks.sectionId, id));
  await db.delete(s.sections).where(eq(s.sections.id, id));
  await publishSections();
  redirect("/admin/sections");
}

export async function saveMedia(form: FormData) {
  const session = await requireAdmin("manager");
  const url = text(form, "url");
  const altEn = text(form, "altEn");
  if (!url || !altEn) throw new Error("URL and English alt text are required");

  await db.insert(s.media).values({
    kind: text(form, "kind") === "video" ? "video" : "image",
    r2Key: url,
    mime: text(form, "kind") === "video" ? "video/mp4" : "image/jpeg",
    bytes: 0,
    altEn,
    altNe: optional(form, "altNe"),
    captionEn: optional(form, "captionEn"),
    captionNe: optional(form, "captionNe"),
    fileHash: `url-${Date.now()}`,
    uploadedBy: session.userId,
  });
}

export async function setKitchenOpen(form: FormData) {
  const session = await requireAdmin("staff");
  const [existing] = await db.select().from(s.storeSettings).limit(1);
  if (!existing) throw new Error("Settings row missing — re-run the seed");

  const open = flag(form, "open");
  await db
    .update(s.storeSettings)
    .set({ isAcceptingOrders: open, updatedAt: new Date() })
    .where(eq(s.storeSettings.id, existing.id));

  await writeAudit({
    actorId: session.userId,
    entity: "settings",
    entityId: existing.id,
    action: open ? "kitchen_opened" : "kitchen_closed",
  });
  await publishSettings();
}

const QR_METHODS_LIMIT = 4;
const QR_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const QR_IMAGE_FORMATS = new Set(["jpeg", "png", "webp", "heif", "avif"]);

function storedQrPath(url: string): string | null {
  if (!url.startsWith("/uploads/qr/") || url.includes("..") || url.includes("\\")) {
    return null;
  }
  const root = path.resolve(process.cwd(), "public", "uploads", "qr");
  const full = path.resolve(process.cwd(), "public", url.slice(1));
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}

async function removeStoredQr(url: string) {
  const full = storedQrPath(url);
  if (!full) return;
  await unlink(full).catch(() => {});
}

function keptImageUrl(value: string): string {
  if (!value || value.includes("..") || value.includes("\\")) return "";
  if (value.startsWith("/")) return value;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return value;
  } catch {
    return "";
  }
  return "";
}

async function writeQrFile(file: File): Promise<string> {
  if (file.size > QR_IMAGE_MAX_BYTES) {
    throw new Error("QR images must be 8 MB or smaller.");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const meta = await sharp(bytes, { failOn: "none" }).metadata();
  if (!meta.format || !QR_IMAGE_FORMATS.has(meta.format)) {
    throw new Error("Use a JPG, PNG, or WebP image for the QR.");
  }
  const out = await sharp(bytes, { failOn: "none" })
    .rotate()
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 90 })
    .toBuffer();
  const filename = `${nanoid()}.webp`;
  const dir = path.join(process.cwd(), "public", "uploads", "qr");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), out);
  return `/uploads/qr/${filename}`;
}

async function readQrMethods(form: FormData): Promise<QrMethod[]> {
  const count = Math.min(QR_METHODS_LIMIT, Number(text(form, "qrCount")) || 0);
  const pending: {
    method: QrMethodName;
    accountName: string;
    note: string | null;
    image: string;
    file: File | null;
  }[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < count; i += 1) {
    const methodRaw = text(form, `qr.${i}.method`);
    if (!isQrMethod(methodRaw)) throw new Error("Choose a payment app.");
    if (seen.has(methodRaw)) {
      throw new Error("Each payment app can only be listed once.");
    }
    seen.add(methodRaw);

    const accountName = text(form, `qr.${i}.accountName`);
    if (!accountName) throw new Error("Each payment method needs an account name.");
    if (accountName.length > 80) throw new Error("Account name is too long.");

    const note = optional(form, `qr.${i}.note`);
    if (note && note.length > 160) throw new Error("Note is too long.");

    const uploaded = form.get(`qr.${i}.file`);
    const file = uploaded instanceof File && uploaded.size > 0 ? uploaded : null;
    const image = keptImageUrl(text(form, `qr.${i}.image`));
    if (!file && !image) throw new Error("Each payment method needs a QR image.");

    pending.push({ method: methodRaw, accountName, note, image, file });
  }

  if (pending.length === 0) {
    throw new Error(
      "Add a payment method and upload its QR before turning prepayment on.",
    );
  }

  const written: string[] = [];
  try {
    const methods: QrMethod[] = [];
    for (const row of pending) {
      let image = row.image;
      if (row.file) {
        image = await writeQrFile(row.file);
        written.push(image);
      }
      methods.push({
        method: row.method,
        accountName: row.accountName,
        image,
        ...(row.note ? { note: row.note } : {}),
      });
    }
    return methods;
  } catch (err) {
    await Promise.all(written.map((url) => removeStoredQr(url)));
    throw err;
  }
}

export async function saveSettings(form: FormData) {
  const session = await requireAdmin("owner");
  const [existing] = await db.select().from(s.storeSettings).limit(1);
  if (!existing) throw new Error("Settings row missing — re-run the seed");

  const hours = JSON.parse(text(form, "openHours") || "[]");
  const prepayEnabled = flag(form, "prepayEnabled");
  const previous = (existing.qrImages as QrMethod[]) ?? [];
  const qrImages = prepayEnabled ? await readQrMethods(form) : previous;

  try {
    await db
      .update(s.storeSettings)
      .set({
        isAcceptingOrders: flag(form, "isAcceptingOrders"),
        openHours: hours,
        minOrder: rupeesField(form, "minOrder"),
        codEnabled: flag(form, "codEnabled"),
        codMax: rupeesField(form, "codMax"),
        prepayEnabled,
        qrImages,
        bannerEn: optional(form, "bannerEn"),
        bannerNe: optional(form, "bannerNe"),
        supportPhone: optional(form, "supportPhone"),
        updatedAt: new Date(),
      })
      .where(eq(s.storeSettings.id, existing.id));
  } catch (err) {
    const kept = new Set(previous.map((qr) => qr.image));
    await Promise.all(
      qrImages
        .map((qr) => qr.image)
        .filter((url) => !kept.has(url))
        .map((url) => removeStoredQr(url)),
    );
    throw err;
  }

  if (prepayEnabled) {
    const kept = new Set(qrImages.map((qr) => qr.image));
    await Promise.all(
      previous
        .map((qr) => qr.image)
        .filter((url) => url.startsWith("/uploads/qr/") && !kept.has(url))
        .map((url) => removeStoredQr(url)),
    );
  }

  await writeAudit({
    actorId: session.userId,
    entity: "settings",
    entityId: existing.id,
    action: "updated",
  });
  await publishSettings();
}

export async function saveZone(form: FormData) {
  await requireAdmin("owner");
  const id = optional(form, "id");
  const values = {
    nameEn: text(form, "nameEn"),
    nameNe: optional(form, "nameNe"),
    fee: rupeesField(form, "fee"),
    codAllowed: flag(form, "codAllowed"),
    isActive: flag(form, "isActive"),
  };
  if (!values.nameEn) throw new Error("Zone name is required");

  if (id) {
    await db.update(s.deliveryZones).set(values).where(eq(s.deliveryZones.id, id));
  } else {
    await db.insert(s.deliveryZones).values(values);
  }
  await publishSettings();
}

"use server";

import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { parseBlock } from "@/lib/blocks/schemas";
import { slugify } from "@/lib/utils";
import { requireAdmin } from "@/lib/auth/session";
import { writeAudit } from "@/server/audit";
import { publishSections, publishSettings } from "@/server/cache";
import { flag, optional, rupeesField, text } from "@/server/form";

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

export async function saveSettings(form: FormData) {
  const session = await requireAdmin("owner");
  const [existing] = await db.select().from(s.storeSettings).limit(1);
  if (!existing) throw new Error("Settings row missing — re-run the seed");

  const hours = JSON.parse(text(form, "openHours") || "[]");
  const qrImages = JSON.parse(text(form, "qrImages") || "[]");

  await db
    .update(s.storeSettings)
    .set({
      isAcceptingOrders: flag(form, "isAcceptingOrders"),
      openHours: hours,
      minOrder: rupeesField(form, "minOrder"),
      codEnabled: flag(form, "codEnabled"),
      codMax: rupeesField(form, "codMax"),
      qrImages,
      bannerEn: optional(form, "bannerEn"),
      bannerNe: optional(form, "bannerNe"),
      supportPhone: optional(form, "supportPhone"),
      updatedAt: new Date(),
    })
    .where(eq(s.storeSettings.id, existing.id));

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

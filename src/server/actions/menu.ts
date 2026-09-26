"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { writeAudit } from "@/server/audit";
import { publishMenu } from "@/server/cache";
import { flag, optional, rupeesField, text } from "@/server/form";
import { slugify } from "@/lib/utils";
import { ONION_GARLIC_GROUP_NAME_EN } from "@/lib/menu/onion-garlic";

const priceSchema = z.object({
  itemId: z.uuid(),
  // Paisa. Capped at Rs 100,000 so a stray keystroke can't create a
  // catastrophic price that someone then has to honour.
  basePrice: z.int().min(100).max(10_000_000),
});

export async function setItemPrice(itemId: string, basePrice: number) {
  const session = await requireAdmin("manager");
  const parsed = priceSchema.parse({ itemId, basePrice });

  const [before] = await db
    .select({ basePrice: s.menuItems.basePrice, nameEn: s.menuItems.nameEn })
    .from(s.menuItems)
    .where(eq(s.menuItems.id, parsed.itemId))
    .limit(1);
  if (!before) throw new Error("NOT_FOUND");

  await db
    .update(s.menuItems)
    .set({ basePrice: parsed.basePrice, updatedAt: new Date() })
    .where(eq(s.menuItems.id, parsed.itemId));

  await writeAudit({
    actorId: session.userId,
    entity: "menu_item",
    entityId: parsed.itemId,
    action: "price_changed",
    diff: { from: before.basePrice, to: parsed.basePrice },
  });

  await publishMenu();
}

const availabilitySchema = z.object({
  itemId: z.uuid(),
  status: z.enum(["draft", "published", "sold_out"]),
});

/**
 * Takes an explicit target status rather than flipping the current one. A
 * derived toggle is not idempotent: if the action is retried (React can re-run
 * an async transition when a revalidation re-renders the row mid-flight) the
 * second run reads the already-updated value and flips it straight back.
 */
export async function setItemAvailability(formData: FormData) {
  const session = await requireAdmin("manager");
  const parsed = availabilitySchema.parse({
    itemId: formData.get("itemId"),
    status: formData.get("status"),
  });

  await db
    .update(s.menuItems)
    .set({ status: parsed.status, updatedAt: new Date() })
    .where(eq(s.menuItems.id, parsed.itemId));

  await writeAudit({
    actorId: session.userId,
    entity: "menu_item",
    entityId: parsed.itemId,
    action: `status_${parsed.status}`,
  });

  await publishMenu();
}

export type ItemFormState = { error?: string };

async function uniqueSlug(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  name: string,
): Promise<string> {
  const base = slugify(name) || "dish";
  let candidate = base;
  for (let n = 2; n < 100; n += 1) {
    const [hit] = await tx
      .select({ id: s.menuItems.id })
      .from(s.menuItems)
      .where(eq(s.menuItems.slug, candidate))
      .limit(1);
    if (!hit) return candidate;
    candidate = `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

async function ensureOnionGarlicGroup(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
): Promise<string> {
  const [existing] = await tx
    .select({ id: s.modifierGroups.id })
    .from(s.modifierGroups)
    .where(eq(s.modifierGroups.nameEn, ONION_GARLIC_GROUP_NAME_EN))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await tx
    .insert(s.modifierGroups)
    .values({
      nameEn: ONION_GARLIC_GROUP_NAME_EN,
      nameNe: "प्याज र लसुन",
      minSelect: 1,
      maxSelect: 1,
      isRequired: true,
    })
    .returning();

  await tx.insert(s.modifiers).values([
    {
      groupId: created.id,
      nameEn: "Include onion & garlic",
      nameNe: "प्याज र लसुन राख्नुहोस्",
      sortOrder: 0,
    },
    {
      groupId: created.id,
      nameEn: "No onion",
      nameNe: "प्याज नराख्नुहोस्",
      sortOrder: 1,
    },
    {
      groupId: created.id,
      nameEn: "No garlic",
      nameNe: "लसुन नराख्नुहोस्",
      sortOrder: 2,
    },
    {
      groupId: created.id,
      nameEn: "No onion, no garlic",
      nameNe: "प्याज र लसुन नराख्नुहोस्",
      sortOrder: 3,
    },
  ]);
  return created.id;
}

export async function saveMenuItem(
  _prev: ItemFormState,
  form: FormData,
): Promise<ItemFormState> {
  const session = await requireAdmin("manager");

  const id = optional(form, "id");
  const nameEn = text(form, "nameEn");
  if (!nameEn) return { error: "English name is required" };

  let basePrice: number;
  try {
    basePrice = rupeesField(form, "basePrice");
  } catch {
    return { error: "Enter a valid price in rupees" };
  }
  if (basePrice < 100) return { error: "Price must be at least Rs 1" };

  const categoryId = text(form, "categoryId");
  const parsedCategory = z.uuid().safeParse(categoryId);
  if (!parsedCategory.success) return { error: "Pick a category" };

  const onionGarlic = flag(form, "onionGarlic");

  const values = {
    categoryId: parsedCategory.data,
    nameEn,
    nameNe: optional(form, "nameNe"),
    descEn: optional(form, "descEn"),
    descNe: optional(form, "descNe"),
    remarksEn: optional(form, "remarksEn"),
    remarksNe: optional(form, "remarksNe"),
    basePrice,
    isVeg: flag(form, "isVeg"),
    spiceLevel: Math.min(4, Math.max(0, Number(text(form, "spiceLevel") || 0))),
    status: z
      .enum(["draft", "published", "sold_out"])
      .parse(text(form, "status") || "draft"),
    seoTitle: optional(form, "seoTitle"),
    seoDesc: optional(form, "seoDesc"),
    updatedAt: new Date(),
  };

  const itemId = await db.transaction(async (tx) => {
    let savedId = id;
    if (savedId) {
      await tx
        .update(s.menuItems)
        .set(values)
        .where(eq(s.menuItems.id, savedId));
    } else {
      const [created] = await tx
        .insert(s.menuItems)
        .values({ ...values, slug: await uniqueSlug(tx, nameEn) })
        .returning();
      savedId = created.id;
    }

    await tx
      .delete(s.itemModifierGroups)
      .where(eq(s.itemModifierGroups.itemId, savedId));
    if (onionGarlic) {
      const groupId = await ensureOnionGarlicGroup(tx);
      await tx.insert(s.itemModifierGroups).values({
        itemId: savedId,
        groupId,
        sortOrder: 0,
      });
    }

    return savedId;
  });

  await writeAudit({
    actorId: session.userId,
    entity: "menu_item",
    entityId: itemId,
    action: id ? "updated" : "created",
  });
  await publishMenu();
  redirect(`/admin/menu/${itemId}`);
}

export async function deleteMenuItem(form: FormData) {
  const session = await requireAdmin("manager");
  const id = text(form, "id");
  z.uuid().parse(id);

  await db
    .update(s.menuItems)
    .set({ deletedAt: new Date(), status: "draft", updatedAt: new Date() })
    .where(eq(s.menuItems.id, id));

  await writeAudit({
    actorId: session.userId,
    entity: "menu_item",
    entityId: id,
    action: "soft_deleted",
  });
  await publishMenu();
  redirect("/admin/menu");
}

export type OptionFormState = { error?: string };

export async function saveModifierGroup(
  _prev: OptionFormState,
  form: FormData,
): Promise<OptionFormState> {
  const session = await requireAdmin("manager");
  const id = optional(form, "id");
  const nameEn = text(form, "nameEn");
  if (!nameEn) return { error: "English name is required" };

  const choicesRaw = optional(form, "choices");
  let choices: {
    nameEn: string;
    nameNe?: string | null;
    priceDeltaRupees: number;
    isAvailable: boolean;
  }[] = [];
  if (choicesRaw) {
    const parsed = z
      .array(
        z.object({
          nameEn: z.string().min(1),
          nameNe: z.string().nullable().optional(),
          priceDeltaRupees: z.number(),
          isAvailable: z.boolean(),
        }),
      )
      .safeParse(JSON.parse(choicesRaw));
    if (!parsed.success) return { error: "Choices look malformed" };
    choices = parsed.data;
  }
  if (choices.length === 0) {
    return { error: "Add at least one choice the customer can pick" };
  }

  const groupId = await db.transaction(async (tx) => {
    const values = {
      nameEn,
      nameNe: optional(form, "nameNe"),
      minSelect: Number(text(form, "minSelect") || 0),
      maxSelect: Number(text(form, "maxSelect") || 1),
      isRequired: flag(form, "isRequired"),
    };

    let saved = id;
    if (saved) {
      await tx
        .update(s.modifierGroups)
        .set(values)
        .where(eq(s.modifierGroups.id, saved));
      await tx.delete(s.modifiers).where(eq(s.modifiers.groupId, saved));
    } else {
      const [created] = await tx
        .insert(s.modifierGroups)
        .values(values)
        .returning();
      saved = created.id;
    }

    await tx.insert(s.modifiers).values(
      choices.map((c, i) => ({
        groupId: saved,
        nameEn: c.nameEn,
        nameNe: c.nameNe || null,
        priceDelta: Math.round(c.priceDeltaRupees * 100),
        isAvailable: c.isAvailable,
        sortOrder: i,
      })),
    );
    return saved;
  });

  await writeAudit({
    actorId: session.userId,
    entity: "modifier_group",
    entityId: groupId,
    action: id ? "updated" : "created",
  });
  await publishMenu();
  return {};
}

export async function deleteModifierGroup(form: FormData) {
  const session = await requireAdmin("manager");
  const id = text(form, "id");
  z.uuid().parse(id);

  await db.delete(s.itemModifierGroups).where(eq(s.itemModifierGroups.groupId, id));
  await db.delete(s.modifiers).where(eq(s.modifiers.groupId, id));
  await db.delete(s.modifierGroups).where(eq(s.modifierGroups.id, id));

  await writeAudit({
    actorId: session.userId,
    entity: "modifier_group",
    entityId: id,
    action: "deleted",
  });
  await publishMenu();
}

export async function saveCategory(form: FormData) {
  await requireAdmin("manager");
  const nameEn = text(form, "nameEn");
  if (!nameEn) return;
  await db.insert(s.categories).values({
    slug: slugify(nameEn),
    nameEn,
    nameNe: optional(form, "nameNe"),
    sortOrder: 99,
  });
  await publishMenu();
}

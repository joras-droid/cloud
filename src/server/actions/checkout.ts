"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { makeOrderCode } from "@/lib/order-code";
import { normalizeNepalPhone } from "@/lib/phone";
import { createTrackSession } from "@/lib/track/session";
import { publishOrders } from "@/server/cache";
import { optional, text } from "@/server/form";
import { getCheckoutCities } from "@/server/queries/checkout";
import { getStoreSettings } from "@/server/queries/settings";
import type { Locale } from "@/i18n/routing";

export type CheckoutState = { error?: string };

const cartLineSchema = z.object({
  itemId: z.uuid(),
  variantId: z.string().nullable(),
  modifiers: z.array(z.object({ id: z.uuid() })),
  qty: z.number().int().min(1).max(20),
});

function localePath(locale: Locale, href: string): string {
  return locale === "ne" ? `/ne${href}` : href;
}

function parseMapUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function placeOrder(
  _prev: CheckoutState,
  form: FormData,
): Promise<CheckoutState> {
  const locale = text(form, "locale") === "ne" ? "ne" : "en";
  const phone = normalizeNepalPhone(text(form, "phone"));
  if (!phone) {
    return { error: "Enter a 10-digit mobile number, like 9800000000." };
  }

  const addressLine = text(form, "addressLine");
  if (addressLine.length < 4) {
    return { error: "Tell us the detailed location so the rider can find you." };
  }

  const mapRaw = optional(form, "mapUrl");
  const mapUrl = parseMapUrl(mapRaw);
  if (mapRaw && !mapUrl) {
    return { error: "The map link must be a full URL, like https://maps.app.goo.gl/…" };
  }

  const zoneId = text(form, "zoneId");
  if (!z.uuid().safeParse(zoneId).success) {
    return { error: "Pick Kathmandu or Lalitpur." };
  }

  const payKind = text(form, "payment") === "cod" ? "cod" : "prepay";
  const callRequested =
    payKind === "cod" ? true : text(form, "callRequested") !== "no";

  let lines: z.infer<typeof cartLineSchema>[];
  try {
    lines = z.array(cartLineSchema).min(1).parse(JSON.parse(text(form, "cart")));
  } catch {
    return { error: "Your cart looks empty. Add a dish and try again." };
  }

  const settings = await getStoreSettings();
  if (!settings.isAcceptingOrders) {
    return { error: "The kitchen is closed right now." };
  }

  const cities = await getCheckoutCities();
  const zone = cities.find((c) => c.id === zoneId);
  if (!zone) return { error: "Pick Kathmandu or Lalitpur." };

  const itemIds = [...new Set(lines.map((l) => l.itemId))];
  const items = await db
    .select()
    .from(s.menuItems)
    .where(and(inArray(s.menuItems.id, itemIds), isNull(s.menuItems.deletedAt)));
  const itemById = new Map(items.map((i) => [i.id, i]));

  const mods = await db.select().from(s.modifiers);
  const modById = new Map(mods.map((m) => [m.id, m]));

  const priced: {
    itemId: string;
    nameEn: string;
    nameNe: string | null;
    unitPrice: number;
    qty: number;
    variantSnapshot: { labelEn: string; labelNe: string | null } | null;
    modifiersSnapshot: { nameEn: string; nameNe: string | null }[];
    lineTotal: number;
  }[] = [];

  for (const line of lines) {
    const item = itemById.get(line.itemId);
    if (!item || item.status === "draft") {
      return { error: "A dish in your cart is no longer on the menu." };
    }
    if (item.status === "sold_out") {
      return { error: `${item.nameEn} is sold out right now.` };
    }

    let unit = item.basePrice;
    const variantSnapshot = null;

    const modifiersSnapshot: { nameEn: string; nameNe: string | null }[] = [];
    for (const picked of line.modifiers) {
      const mod = modById.get(picked.id);
      if (!mod) return { error: "An option in your cart is no longer available." };
      unit += mod.priceDelta;
      modifiersSnapshot.push({ nameEn: mod.nameEn, nameNe: mod.nameNe });
    }

    priced.push({
      itemId: item.id,
      nameEn: item.nameEn,
      nameNe: item.nameNe,
      unitPrice: unit,
      qty: line.qty,
      variantSnapshot,
      modifiersSnapshot,
      lineTotal: unit * line.qty,
    });
  }

  const subtotal = priced.reduce((n, l) => n + l.lineTotal, 0);
  if (subtotal < settings.minOrder) {
    return {
      error: `Minimum order is Rs ${Math.round(settings.minOrder / 100)}.`,
    };
  }

  const deliveryFee = zone.fee;
  const total = subtotal + deliveryFee;

  if (payKind === "cod") {
    if (!settings.codEnabled || !zone.codAllowed) {
      return { error: "Cash on delivery is not available for this city." };
    }
    if (total > settings.codMax) {
      return {
        error: `Cash on delivery is limited to Rs ${Math.round(settings.codMax / 100)}.`,
      };
    }
  }

  const method = payKind === "cod" ? "cod" : "fonepay";
  const status = payKind === "cod" ? "pending_confirmation" : "pending_payment";

  const [existingCustomer] = await db
    .select()
    .from(s.customers)
    .where(eq(s.customers.phone, phone))
    .limit(1);

  if (existingCustomer?.isBlocked && payKind === "cod") {
    return { error: "Cash on delivery is not available for this number." };
  }

  let customerId = existingCustomer?.id;
  if (!customerId) {
    const [created] = await db
      .insert(s.customers)
      .values({ phone, name: phone })
      .returning();
    customerId = created.id;
  }

  let orderCode = makeOrderCode();
  let created:
    | { id: string; orderCode: string }
    | undefined;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      created = await db.transaction(async (tx) => {
        const [order] = await tx
          .insert(s.orders)
          .values({
            orderCode,
            customerId,
            status,
            paymentMethod: method,
            zoneId: zone.id,
            addressLine,
            mapUrl,
            callRequested,
            locale,
            subtotal,
            deliveryFee,
            total,
            expiresAt:
              payKind === "prepay"
                ? new Date(Date.now() + 45 * 60 * 1000)
                : null,
          })
          .returning({ id: s.orders.id, orderCode: s.orders.orderCode });

        await tx.insert(s.orderItems).values(
          priced.map((line) => ({
            orderId: order.id,
            itemId: line.itemId,
            nameEnSnapshot: line.nameEn,
            nameNeSnapshot: line.nameNe,
            unitPriceSnapshot: line.unitPrice,
            qty: line.qty,
            variantSnapshot: line.variantSnapshot,
            modifiersSnapshot: line.modifiersSnapshot,
            lineTotal: line.lineTotal,
          })),
        );

        await tx.insert(s.payments).values({
          orderId: order.id,
          method,
          amount: total,
          payerPhone: phone,
          status: "pending",
        });

        await tx.insert(s.orderEvents).values({
          orderId: order.id,
          toStatus: status,
          note:
            payKind === "cod"
              ? "COD — kitchen will call to confirm"
              : callRequested
                ? "Prepay — customer asked to be called"
                : "Prepay — customer asked not to be called",
        });

        return order;
      });
      break;
    } catch {
      orderCode = makeOrderCode();
    }
  }

  if (!created) return { error: "Could not place the order. Try again." };

  await createTrackSession(phone);
  await publishOrders();

  redirect(
    localePath(
      locale,
      payKind === "prepay"
        ? `/checkout/pay/${created.orderCode}`
        : `/checkout/done/${created.orderCode}`,
    ),
  );
}

export async function submitPaymentProof(
  _prev: CheckoutState,
  form: FormData,
): Promise<CheckoutState> {
  const locale = text(form, "locale") === "ne" ? "ne" : "en";
  const code = text(form, "orderCode").toUpperCase();
  if (!/^GKS-[A-Z2-9]{4}$/.test(code)) {
    return { error: "That order code does not look right." };
  }

  const [row] = await db
    .select({
      order: s.orders,
      payment: s.payments,
      phone: s.customers.phone,
    })
    .from(s.orders)
    .innerJoin(s.customers, eq(s.orders.customerId, s.customers.id))
    .leftJoin(s.payments, eq(s.payments.orderId, s.orders.id))
    .where(eq(s.orders.orderCode, code))
    .limit(1);

  const waiting =
    row.order.status === "pending_payment" ||
    row.order.status === "payment_rejected";
  if (!row || !waiting) {
    return { error: "This order is not waiting for a payment screenshot." };
  }

  const file = form.get("screenshot");
  let screenshotKey: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.size > 8 * 1024 * 1024) {
      return { error: "The screenshot must be 8 MB or smaller." };
    }
    const mime = file.type;
    if (!["image/jpeg", "image/png", "image/webp", "image/heic"].includes(mime)) {
      return { error: "Upload a JPG, PNG, WebP or HEIC screenshot." };
    }
    const ext =
      mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const dir = path.join(process.cwd(), "public", "uploads", "payments");
    await mkdir(dir, { recursive: true });
    const filename = `${code}-${Date.now()}.${ext}`;
    await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
    screenshotKey = `/uploads/payments/${filename}`;
  } else {
    const pasted = parseMapUrl(optional(form, "screenshotUrl"));
    if (pasted) screenshotKey = pasted;
  }

  if (!screenshotKey) {
    return { error: "Add the payment screenshot so we can match your order." };
  }

  const [media] = await db
    .insert(s.media)
    .values({
      kind: "image",
      r2Key: screenshotKey,
      mime: file instanceof File && file.size > 0 ? file.type : "image/jpeg",
      bytes: file instanceof File && file.size > 0 ? file.size : 0,
      altEn: `Payment screenshot ${code}`,
      fileHash: `pay-${code}-${Date.now()}`,
    })
    .returning();

  await db.transaction(async (tx) => {
    if (row.payment) {
      await tx
        .update(s.payments)
        .set({
          screenshotMediaId: media.id,
          status: "submitted",
        })
        .where(eq(s.payments.id, row.payment.id));
    }
    await tx
      .update(s.orders)
      .set({ status: "payment_submitted" })
      .where(eq(s.orders.id, row.order.id));
    await tx.insert(s.orderEvents).values({
      orderId: row.order.id,
      fromStatus: row.order.status,
      toStatus: "payment_submitted",
      note: "Customer uploaded a payment screenshot",
    });
  });

  await createTrackSession(row.phone);
  await publishOrders();
  const next =
    text(form, "returnTo") === "track"
      ? "/track"
      : `/checkout/done/${code}`;
  redirect(localePath(locale, next));
}

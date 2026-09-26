import { asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import * as s from "@/db/schema";

export type QrMethod = {
  method: "fonepay" | "esewa" | "khalti" | "bank";
  accountName: string;
  image: string;
  note?: string;
};

export type OpenHour = {
  day: number;
  open: string;
  close: string;
  closed: boolean;
};

const FALLBACK = {
  isAcceptingOrders: false,
  openHours: [] as OpenHour[],
  minOrder: 0,
  codEnabled: false,
  codMax: 0,
  qrImages: [] as QrMethod[],
  bannerEn: null as string | null,
  bannerNe: null as string | null,
  supportPhone: null as string | null,
};

async function loadSettings() {
  const [row] = await db.select().from(s.storeSettings).limit(1);
  if (!row) return FALLBACK;
  return {
    isAcceptingOrders: row.isAcceptingOrders,
    openHours: row.openHours as OpenHour[],
    minOrder: row.minOrder,
    codEnabled: row.codEnabled,
    codMax: row.codMax,
    qrImages: row.qrImages as QrMethod[],
    bannerEn: row.bannerEn,
    bannerNe: row.bannerNe,
    supportPhone: row.supportPhone,
  };
}

export const getStoreSettings = unstable_cache(loadSettings, ["settings"], {
  tags: ["settings"],
  revalidate: 3600,
});

async function loadZones() {
  return db
    .select({
      id: s.deliveryZones.id,
      nameEn: s.deliveryZones.nameEn,
      nameNe: s.deliveryZones.nameNe,
      fee: s.deliveryZones.fee,
      codAllowed: s.deliveryZones.codAllowed,
    })
    .from(s.deliveryZones)
    .where(eq(s.deliveryZones.isActive, true))
    .orderBy(asc(s.deliveryZones.sortOrder));
}

export const getDeliveryZones = unstable_cache(loadZones, ["zones"], {
  tags: ["zones"],
  revalidate: 3600,
});

export type DeliveryZone = Awaited<ReturnType<typeof getDeliveryZones>>[number];

/**
 * Kitchen hours in Asia/Kathmandu regardless of where the VPS or the customer
 * is. Nepal's +05:45 offset makes "just use the server clock" a real bug.
 */
export function isKitchenOpen(hours: OpenHour[], now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kathmandu",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const weekdayName = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const day = days.indexOf(weekdayName);
  const nowMinutes = Number(hour) * 60 + Number(minute);

  const today = hours.find((h) => h.day === day);
  if (!today || today.closed) return false;

  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  return (
    nowMinutes >= toMinutes(today.open) && nowMinutes < toMinutes(today.close)
  );
}

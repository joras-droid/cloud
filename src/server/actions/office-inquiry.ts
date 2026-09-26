"use server";

import { db } from "@/db";
import * as s from "@/db/schema";
import { normalizeNepalPhone } from "@/lib/phone";
import {
  isClockTime,
  isHeadcountRange,
  isOfficeMeal,
  parseOfficeDays,
} from "@/lib/office-inquiry";
import { checkRateLimit } from "@/lib/rate-limit";
import { optional, text } from "@/server/form";

export type OfficeInquiryError = "invalid" | "invalid_phone" | "rate_limited";
export type OfficeInquiryState = { ok?: true; error?: OfficeInquiryError };

export async function submitOfficeInquiry(
  _prev: OfficeInquiryState,
  form: FormData,
): Promise<OfficeInquiryState> {
  if (text(form, "company")) return { ok: true };

  const businessName = text(form, "businessName").replace(/\s+/g, " ").slice(0, 120);
  const location = text(form, "location").replace(/\s+/g, " ").slice(0, 200);
  const phone = normalizeNepalPhone(text(form, "phone"));
  const mealRaw = text(form, "meal");
  const rangeRaw = text(form, "headcountRange");
  const days = parseOfficeDays(form.getAll("days").map(String));
  const lunchTime = optional(form, "lunchTime");
  const snacksTime = optional(form, "snacksTime");

  if (!phone) return { error: "invalid_phone" };

  if (
    businessName.length < 2 ||
    !/[\p{L}\p{N}]/u.test(businessName) ||
    location.length < 3 ||
    !/[\p{L}\p{N}]/u.test(location) ||
    !days ||
    !isOfficeMeal(mealRaw) ||
    !isHeadcountRange(rangeRaw)
  ) {
    return { error: "invalid" };
  }

  const wantsLunch = mealRaw === "lunch" || mealRaw === "both";
  const wantsSnacks = mealRaw === "snacks" || mealRaw === "both";
  if (wantsLunch && (!lunchTime || !isClockTime(lunchTime))) {
    return { error: "invalid" };
  }
  if (wantsSnacks && (!snacksTime || !isClockTime(snacksTime))) {
    return { error: "invalid" };
  }

  const limited = await checkRateLimit(`office:${phone}`, 5, 3600);
  if (!limited.ok) return { error: "rate_limited" };

  await db.insert(s.businessInquiries).values({
    businessName,
    location,
    phone,
    days,
    meal: mealRaw,
    headcountRange: rangeRaw,
    lunchTime: wantsLunch ? lunchTime : null,
    snacksTime: wantsSnacks ? snacksTime : null,
  });

  return { ok: true };
}

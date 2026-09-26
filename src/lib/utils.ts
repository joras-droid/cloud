import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Locale } from "@/i18n/routing";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Falls back to English when a Nepali field is empty. The admin is nudged to
 * translate but never blocked by it — adding a dish at 8pm must not wait on
 * someone finding the Nepali word for "confit".
 */
export function pick(
  locale: Locale,
  en: string | null | undefined,
  ne: string | null | undefined,
): string {
  if (locale === "ne" && ne && ne.trim()) return ne;
  return en ?? "";
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

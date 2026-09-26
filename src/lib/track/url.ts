import "server-only";
import { env } from "@/env";
import { normalizeNepalPhone } from "@/lib/phone";

/** Public link an admin can send: https://domain/track/9800000000 */
export function trackPageUrl(phone: string): string | null {
  const normalized = normalizeNepalPhone(phone);
  if (!normalized) return null;
  const origin = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  return `${origin}/track/${normalized}`;
}

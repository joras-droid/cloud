import { env } from "@/env";

/**
 * Seed and placeholder rows store a full URL in `r2_key`; real uploads store a
 * bucket key. Resolving both here means the rest of the app never branches on
 * whether an image is a placeholder.
 */
export function mediaUrl(r2Key: string | null | undefined): string | null {
  if (!r2Key) return null;
  if (
    r2Key.startsWith("http://") ||
    r2Key.startsWith("https://") ||
    r2Key.startsWith("/")
  ) {
    return r2Key;
  }
  if (!env.R2_PUBLIC_BASE_URL) return null;
  return `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${r2Key}`;
}

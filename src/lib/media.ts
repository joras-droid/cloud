import { env, hasS3 } from "@/env";
import { isObjectMenuKey, s3PublicBaseUrl } from "@/lib/media/storage";

/**
 * Seed and placeholder rows store a full URL in `r2_key`; real uploads store a
 * bucket key or a site path. Resolving all shapes here keeps callers simple.
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
  if (hasS3 && isObjectMenuKey(r2Key)) {
    return `${s3PublicBaseUrl()}/${r2Key}`;
  }
  if (env.R2_PUBLIC_BASE_URL) {
    return `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${r2Key}`;
  }
  return null;
}

import "server-only";
import { cookies } from "next/headers";
import {
  TRACK_COOKIE,
  readTrackToken,
  signTrackToken,
  trackCookieOptions,
} from "@/lib/track/token";

export { TRACK_COOKIE };

export async function createTrackSession(phone: string): Promise<void> {
  const token = await signTrackToken(phone);
  const store = await cookies();
  store.set(TRACK_COOKIE, token, trackCookieOptions());
}

export async function destroyTrackSession(): Promise<void> {
  const store = await cookies();
  store.delete(TRACK_COOKIE);
}

export async function getTrackPhone(): Promise<string | null> {
  const token = (await cookies()).get(TRACK_COOKIE)?.value;
  if (!token) return null;
  return readTrackToken(token);
}

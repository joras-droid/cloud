import { SignJWT, jwtVerify } from "jose";
import { env } from "@/env";

/** Phone-only gate for the public track page. Not an account. */
export const TRACK_COOKIE = "gks_track";
export const TRACK_MAX_AGE_SECONDS = 60 * 60 * 24;

const key = new TextEncoder().encode(env.SESSION_SECRET);

export function trackCookieOptions() {
  return {
    httpOnly: true as const,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TRACK_MAX_AGE_SECONDS,
  };
}

export async function signTrackToken(phone: string): Promise<string> {
  return new SignJWT({ kind: "track", phone })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TRACK_MAX_AGE_SECONDS}s`)
    .sign(key);
}

export async function readTrackToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (payload.kind !== "track" || typeof payload.phone !== "string") return null;
    return payload.phone;
  } catch {
    return null;
  }
}

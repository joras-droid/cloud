import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "@/env";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "./constants";

export type AdminRole = "owner" | "manager" | "staff";

export type AdminSession = {
  userId: string;
  email: string;
  name: string;
  role: AdminRole;
};

const key = new TextEncoder().encode(env.SESSION_SECRET);

export async function createSession(session: AdminSession): Promise<void> {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(key);

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as AdminRole,
    };
  } catch {
    return null;
  }
}

/** Role ordering used by the permission checks below. */
const RANK: Record<AdminRole, number> = { staff: 1, manager: 2, owner: 3 };

/**
 * The real authorization boundary. `proxy.ts` only does a cheap cookie check
 * to redirect logged-out users; every page and action that touches data calls
 * this, because a proxy can be bypassed by a direct request to a Server Action
 * endpoint.
 */
export async function requireAdmin(
  minimum: AdminRole = "staff",
): Promise<AdminSession> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  if (RANK[session.role] < RANK[minimum]) throw new Error("FORBIDDEN");
  return session;
}

export function can(role: AdminRole, minimum: AdminRole): boolean {
  return RANK[role] >= RANK[minimum];
}

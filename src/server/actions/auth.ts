"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { createSession, destroySession } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { error: "Enter a valid email and password" };

  const { email, password, next } = parsed.data;

  const limit = await checkRateLimit(`login:${email}`, 8, 300);
  if (!limit.ok) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  const [user] = await db
    .select()
    .from(s.adminUsers)
    .where(eq(s.adminUsers.email, email))
    .limit(1);

  // Hash a dummy value when the user is missing so the response time doesn't
  // reveal which emails exist.
  const hash = user?.passwordHash ?? "$2b$12$invalidinvalidinvalidinvalidinvalid";
  const valid = await bcrypt.compare(password, hash);

  if (!user || !valid || !user.isActive) {
    return { error: "Those details don't match an account" };
  }

  await db
    .update(s.adminUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(s.adminUsers.id, user.id));

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  redirect(next && next.startsWith("/admin") ? next : "/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

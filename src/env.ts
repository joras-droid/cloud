import { z } from "zod";

/**
 * Fail at boot, not at 8pm on a Friday when someone tries to check out.
 */
const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().default("gharkoswad"),
  R2_PUBLIC_BASE_URL: z.url().optional(),

  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET_NAME: z.string().optional(),
  AWS_S3_PUBLIC_BASE_URL: z.url().optional(),

  SPARROW_SMS_TOKEN: z.string().optional(),
  SPARROW_SMS_FROM: z.string().default("GharKoSwad"),

  CLOUDFLARE_ZONE_ID: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),

  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

function loadEnv(): ServerEnv {
  // An unset credential in .env reads as "", which is not the same as absent to
  // Zod. Normalise so optional-with-default fields behave as intended.
  const raw = Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => v !== ""),
  );
  const parsed = serverSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();

/** SMS and object storage fall back to local stubs until credentials exist. */
export const hasR2 = Boolean(
  env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY,
);
export const hasS3 = Boolean(
  env.AWS_REGION &&
    env.AWS_ACCESS_KEY_ID &&
    env.AWS_SECRET_ACCESS_KEY &&
    env.AWS_S3_BUCKET_NAME,
);
export const hasSms = Boolean(env.SPARROW_SMS_TOKEN);

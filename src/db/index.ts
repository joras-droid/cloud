import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

/**
 * Next.js dev reloads modules on every edit; without caching the client on
 * globalThis we'd leak a connection pool per reload.
 */
const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.pgClient ??
  postgres(env.DATABASE_URL, {
    max: env.NODE_ENV === "production" ? 20 : 5,
    prepare: false,
  });

if (env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema });
export { schema };

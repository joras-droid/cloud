import "server-only";
import { createClient, type RedisClientType } from "redis";
import { env } from "@/env";

const globalForRedis = globalThis as unknown as { redis?: RedisClientType };

async function getRedis(): Promise<RedisClientType | null> {
  if (globalForRedis.redis?.isOpen) return globalForRedis.redis;
  try {
    const client = createClient({ url: env.REDIS_URL }) as RedisClientType;
    client.on("error", () => {});
    await client.connect();
    globalForRedis.redis = client;
    return client;
  } catch {
    return null;
  }
}

export type RateLimitResult = { ok: boolean; remaining: number };

/**
 * Fixed-window counter in Redis. Deliberately fails open: a Redis outage must
 * not stop customers from checking out. The endpoints this guards (login, OTP,
 * upload, review) all have a second line of defence server-side.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const redis = await getRedis();
  if (!redis) return { ok: true, remaining: limit };

  try {
    const redisKey = `rl:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) await redis.expire(redisKey, windowSeconds);
    return { ok: count <= limit, remaining: Math.max(0, limit - count) };
  } catch {
    return { ok: true, remaining: limit };
  }
}

export async function redisSet(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  const redis = await getRedis();
  await redis?.set(key, value, { EX: ttlSeconds });
}

export async function redisGet(key: string): Promise<string | null> {
  const redis = await getRedis();
  if (!redis) return null;
  return redis.get(key);
}

export async function redisDel(key: string): Promise<void> {
  const redis = await getRedis();
  await redis?.del(key);
}

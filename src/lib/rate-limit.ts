import "server-only";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db, t } from "@/db/client";

/**
 * Fixed-window rate limits stored in Postgres, so every Vercel instance shares the same counters.
 * Each check is a single atomic upsert: concurrent requests can't both slip under the limit.
 */
async function hit(key: string, windowMs: number) {
  const now = Date.now();
  const row = await db
    .insert(t.rateLimits)
    .values({ key, count: 1, resetAt: now + windowMs })
    .onConflictDoUpdate({
      target: t.rateLimits.key,
      set: {
        count: sql`CASE WHEN ${t.rateLimits.resetAt} < ${now} THEN 1 ELSE ${t.rateLimits.count} + 1 END`,
        resetAt: sql`CASE WHEN ${t.rateLimits.resetAt} < ${now} THEN ${now + windowMs} ELSE ${t.rateLimits.resetAt} END`,
      },
    })
    .returning({ count: t.rateLimits.count, resetAt: t.rateLimits.resetAt })
    .get();
  // Opportunistic cleanup of long-expired windows (about 1 call in 200).
  if (Math.random() < 0.005) await db.delete(t.rateLimits).where(lt(t.rateLimits.resetAt, now - 3_600_000)).run();
  return { count: row!.count, resetAt: row!.resetAt, now };
}

export async function rateLimit(key: string, limit: number, windowMs: number) {
  const { count, resetAt, now } = await hit(key, windowMs);
  return { ok: count <= limit, remaining: Math.max(0, limit - count), retryInMs: resetAt - now };
}

/** Failure counters: only failed attempts count, and a success can clear them. */
export async function failures(key: string) {
  const row = await db
    .select({ count: t.rateLimits.count })
    .from(t.rateLimits)
    .where(and(eq(t.rateLimits.key, key), gte(t.rateLimits.resetAt, Date.now())))
    .get();
  return row?.count ?? 0;
}
export async function recordFailure(key: string, windowMs: number) {
  await hit(key, windowMs);
}
export async function clearFailures(key: string) {
  await db.delete(t.rateLimits).where(eq(t.rateLimits.key, key)).run();
}

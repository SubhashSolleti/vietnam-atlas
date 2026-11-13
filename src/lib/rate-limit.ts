import "server-only";

/**
 * Small in-memory fixed-window limiter. Adequate for a single local Node process;
 * a multi-instance deployment should swap this for Redis/Upstash.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  // Bound memory: drop expired windows once the table grows.
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  b.count++;
  return { ok: b.count <= limit, remaining: Math.max(0, limit - b.count), retryInMs: b.resetAt - now };
}

/** Failure counters: only failed attempts count, and a success can clear them. */
export function failures(key: string) {
  const now = Date.now();
  const b = buckets.get(key);
  return b && b.resetAt >= now ? b.count : 0;
}
export function recordFailure(key: string, windowMs: number) {
  rateLimit(key, Number.MAX_SAFE_INTEGER, windowMs);
}
export function clearFailures(key: string) {
  buckets.delete(key);
}

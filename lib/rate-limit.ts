// Distributed rate limiting via Upstash Redis.
// Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN for production.
// Without those vars, falls back to in-process store (broken under multiple serverless workers).
//
// NOTE: The Upstash limiter is initialized once with the first call's limit/windowMs.
// Both current callers use (5, 10 min), so a singleton is fine.

interface Window { timestamps: number[] }
const store = new Map<string, Window>();

type UpstashLimiter = { limit: (key: string) => Promise<{ success: boolean; reset: number }> };
let upstash: UpstashLimiter | null = null;
let upstashReady = false;

async function getUpstash(limit: number, windowMs: number): Promise<UpstashLimiter | null> {
  if (upstashReady) return upstash;
  upstashReady = true;

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;

  try {
    const [{ Ratelimit }, { Redis }] = await Promise.all([
      import('@upstash/ratelimit'),
      import('@upstash/redis'),
    ]);
    const windowSecs = Math.floor(windowMs / 1000);
    const windowStr = windowSecs >= 60
      ? `${Math.floor(windowSecs / 60)} m`
      : `${windowSecs} s`;
    upstash = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(limit, windowStr as `${number} ${'s' | 'm' | 'h' | 'd'}`),
    });
  } catch {
    // packages not installed or misconfigured — fall through to in-memory
  }
  return upstash;
}

function inMemoryCheck(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(key) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
  if (entry.timestamps.length === 0) store.delete(key);
  if (entry.timestamps.length >= limit) {
    return { allowed: false, retryAfterMs: entry.timestamps[0] + windowMs - now };
  }
  entry.timestamps.push(now);
  store.set(key, entry);
  return { allowed: true, retryAfterMs: 0 };
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const limiter = await getUpstash(limit, windowMs);
  if (limiter) {
    const { success, reset } = await limiter.limit(key);
    return { allowed: success, retryAfterMs: success ? 0 : Math.max(0, reset - Date.now()) };
  }
  return inMemoryCheck(key, limit, windowMs);
}

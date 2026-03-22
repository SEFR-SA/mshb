interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Token-bucket rate limiter (in-memory, per-isolate).
 * @param key      Unique key — user ID, IP address, etc.
 * @param limit    Max requests allowed per window
 * @param windowMs Window duration in milliseconds
 * @returns true if the request should be blocked
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > limit;
}

export function rateLimitResponse(): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down." }),
    { status: 429, headers: { "Content-Type": "application/json" } },
  );
}

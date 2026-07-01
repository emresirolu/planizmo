import "server-only";

/**
 * Best-effort, in-memory rate limiting for the AI endpoints (sliding window).
 *
 * Serverless instances don't share memory, so this caps abuse *per instance*
 * rather than globally — enough to stop a runaway client or a tight loop from
 * hammering the model (and our bill). For a hard global limit, swap the bucket
 * store for Upstash/Redis: keep the same `allowRequest` / `allowAnon` surface
 * and no call site has to change.
 *
 * Policy (per the security spec):
 *   - signed-in user:      20 AI requests / hour   (shared across all AI routes)
 *   - anonymous / IP:       5 AI requests / hour
 *   - plus a short burst guard so a rapid-fire loop trips in seconds, not an hour.
 */

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

const USER_PER_HOUR = 20;
const ANON_PER_HOUR = 5;
const BURST_PER_MINUTE = 10;

type Window = { limit: number; windowMs: number };

/** key -> ascending hit timestamps within the largest window we track. */
const buckets = new Map<string, number[]>();

/**
 * Record a hit against `key` for the given window; returns false (and records
 * nothing new) when the caller is already at or over the limit.
 */
function take(key: string, { limit, windowMs }: Window): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  return true;
}

/**
 * Allow an AI request from a signed-in user. Enforces the hourly cap first
 * (short-circuits so the burst window isn't charged when the hour is spent),
 * then the per-minute burst guard.
 */
export function allowRequest(userId: string): boolean {
  return (
    take(`u:hour:${userId}`, { limit: USER_PER_HOUR, windowMs: HOUR_MS }) &&
    take(`u:min:${userId}`, { limit: BURST_PER_MINUTE, windowMs: MINUTE_MS })
  );
}

/**
 * Allow an AI request keyed on a client IP (the anonymous fallback). AI routes
 * currently require auth, so this is here for any future public AI surface —
 * derive the IP server-side; never trust a client-supplied identifier.
 */
export function allowAnon(ip: string): boolean {
  const key = ip || "unknown";
  return (
    take(`ip:hour:${key}`, { limit: ANON_PER_HOUR, windowMs: HOUR_MS }) &&
    take(`ip:min:${key}`, { limit: BURST_PER_MINUTE, windowMs: MINUTE_MS })
  );
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

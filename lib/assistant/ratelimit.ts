import "server-only";

/**
 * Light, best-effort per-user rate limiting (in-memory sliding window). Serverless
 * instances don't share memory, so this caps bursts per instance rather than
 * globally — enough to prevent a runaway client from hammering the model.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 15;

const hits = new Map<string, number[]>();

export function allowRequest(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(userId, recent);
    return false;
  }
  recent.push(now);
  hits.set(userId, recent);
  return true;
}

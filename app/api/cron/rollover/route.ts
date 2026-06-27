import { runHealthSyncAll, runRollover } from "@/lib/db/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Nightly rollover. Recomputes streak/strength for every streak-based widget
 * (registering missed days, applying grace/reset) and decrements monthly
 * freezes. Idempotent — safe to run repeatedly.
 *
 * Protected by CRON_SECRET. Vercel Cron sends `Authorization: Bearer <secret>`
 * automatically when CRON_SECRET is set on the project.
 */
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Sync health first so the streak recompute below sees fresh sleep/steps logs.
  const health = await runHealthSyncAll();
  const summary = await runRollover();
  return Response.json({ ok: true, health, summary });
}

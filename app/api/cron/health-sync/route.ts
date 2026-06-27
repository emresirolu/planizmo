import { runHealthSyncAll } from "@/lib/db/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Standalone health-sync endpoint (CRON_SECRET-guarded, idempotent). The nightly
 * run is folded into /api/cron/rollover to stay within the Hobby plan's cron
 * limit; this route is available for independent/manual cron triggering.
 */
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const summary = await runHealthSyncAll();
  return Response.json({ ok: true, summary });
}

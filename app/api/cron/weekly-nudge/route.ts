import { runWeeklyNudge } from "@/lib/db/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Sunday-evening nudge to plan the week. Drops one gentle invitation into each
 * user's assistant rail. Idempotent (one per user per local week).
 *
 * Protected by CRON_SECRET — Vercel Cron sends it as `Authorization: Bearer`.
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

  const summary = await runWeeklyNudge();
  return Response.json({ ok: true, summary });
}

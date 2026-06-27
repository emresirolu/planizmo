import { auth } from "@/auth";
import {
  countWeekPlansSince,
  getMyPlan,
  getMyTimezone,
  getWeekPlan,
  upsertWeekPlanDraft,
} from "@/lib/db/scoped";
import { allowRequest } from "@/lib/assistant/ratelimit";
import { generateWeekPlan } from "@/lib/plan/generate";
import { can, LIMITS, UPGRADE_COPY } from "@/lib/billing/plan";
import { mondayOf } from "@/lib/widgets/streak";
import { todayInTimeZone } from "@/lib/widgets/date";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  if (!allowRequest(session.user.id)) {
    return Response.json(
      { ok: false, error: "You're planning quickly — give me a moment." },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    brain_dump_text?: unknown;
    week_start?: unknown;
  };
  const brainDump = String(body.brain_dump_text ?? "").slice(0, 4000);

  // Coerce week_start to a Monday; default to the current local week.
  const tz = await getMyTimezone();
  const requested =
    typeof body.week_start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.week_start)
      ? body.week_start
      : todayInTimeZone(tz);
  const weekStart = mondayOf(requested);

  // Meter free weekly plans (re-planning an existing week doesn't consume one).
  if (!can(await getMyPlan(), "unlimited_ai_planning")) {
    const existing = await getWeekPlan(weekStart);
    if (!existing) {
      const used = await countWeekPlansSince(new Date(Date.now() - 30 * 86400000));
      if (used >= LIMITS.weeklyPlansPerMonth) {
        return Response.json({ ok: false, upgrade: true, error: UPGRADE_COPY.weekly_plan }, { status: 402 });
      }
    }
  }

  const plan = await generateWeekPlan(weekStart, brainDump);
  const row = await upsertWeekPlanDraft(weekStart, brainDump, plan);

  return Response.json({ ok: true, plan, status: row.status, weekStart });
}

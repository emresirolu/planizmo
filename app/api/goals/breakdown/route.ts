import { NextResponse } from "next/server";
import {
  getMyTimezone,
  getMyWidget,
  getLogsSince,
  listGoals,
  requireUserId,
  UnauthenticatedError,
} from "@/lib/db/scoped";
import { todayInTimeZone } from "@/lib/widgets/date";
import { addDays } from "@/lib/widgets/streak";
import { callDeepSeek, hasDeepSeekKey, type ChatMsg } from "@/lib/assistant/deepseek";
import { allowRequest } from "@/lib/assistant/ratelimit";

export const runtime = "nodejs";

const SYSTEM = `You break a personal goal into a concrete plan.
You are given the goal (title, optional next step, target date, current progress %) and, if linked, a habit/tracker with recent completion.
Return ONLY this JSON: { "steps": ["...", "..."] } with 3-5 short, concrete, sequenced steps to reach the goal.
Ground steps in the goal and any linked tracker; make them small and actionable. No prose, no code fences.`;

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (e) {
    if (e instanceof UnauthenticatedError) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    throw e;
  }
  if (!allowRequest(userId)) {
    return NextResponse.json({ ok: false, error: "Give me a moment — too many requests." }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const goalId = typeof body.goalId === "string" ? body.goalId : null;
  if (!goalId) return NextResponse.json({ ok: false, error: "Missing goal." }, { status: 400 });

  const goals = await listGoals();
  const goal = goals.find((g) => g.id === goalId);
  if (!goal) return NextResponse.json({ ok: false, error: "Goal not found." }, { status: 404 });

  // Linked tracker recent completion (if any).
  let linked: { title: string; completedDays: number; window: number } | null = null;
  if (goal.linkedWidgetId) {
    const w = await getMyWidget(goal.linkedWidgetId);
    if (w) {
      const tz = await getMyTimezone();
      const since = addDays(todayInTimeZone(tz), -28);
      const logs = await getLogsSince(since);
      const completedDays = logs.filter((l) => l.widgetId === w.id && l.completed).length;
      linked = { title: w.title, completedDays, window: 28 };
    }
  }

  const context = {
    title: goal.title,
    nextStep: goal.nextStep,
    targetDate: goal.targetDate,
    progressPct: goal.progressPct,
    description: goal.description,
    linkedTracker: linked,
  };

  const fallback = [
    "Define what 'done' looks like in one concrete sentence.",
    "Pick the single next action you can do this week.",
    goal.linkedWidgetId ? "Keep the linked habit consistent — aim for a small weekly target." : "Set a small weekly target to build momentum.",
    "Schedule a quick check-in to review progress and adjust.",
  ];

  if (!hasDeepSeekKey()) {
    return NextResponse.json({ ok: true, steps: fallback, model: false });
  }

  const messages: ChatMsg[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: JSON.stringify(context) },
  ];
  try {
    const raw = await callDeepSeek(messages, 380, { json: true, timeoutMs: 20_000 });
    const parsed = JSON.parse(raw) as { steps?: unknown };
    const steps = Array.isArray(parsed.steps)
      ? parsed.steps.filter((s): s is string => typeof s === "string" && s.trim().length > 0).slice(0, 6)
      : [];
    return NextResponse.json({ ok: true, steps: steps.length ? steps : fallback, model: steps.length > 0 });
  } catch {
    return NextResponse.json({ ok: true, steps: fallback, model: false });
  }
}

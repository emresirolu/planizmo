import { NextResponse } from "next/server";
import {
  getBodyMetricsSince,
  getLogsSince,
  getMyTimezone,
  getTodayLogs,
  getTransactionsSince,
  listEventsBetween,
  listGoals,
  listMyWidgets,
  listRecentWorkouts,
  requireUserId,
  UnauthenticatedError,
} from "@/lib/db/scoped";
import { todayInTimeZone } from "@/lib/widgets/date";
import { addDays } from "@/lib/widgets/streak";
import { isScheduledToday } from "@/lib/widgets/logic";
import { callDeepSeek, hasDeepSeekKey, type ChatMsg } from "@/lib/assistant/deepseek";
import { allowRequest } from "@/lib/assistant/ratelimit";

export const runtime = "nodejs";

const INSIGHT_SYSTEM = `You are Planizmo's analyst — calm and grounded.
You are given a JSON snapshot across the user's life areas (trackers with recent-vs-prior averages, gym, finance, goals).
Write 1-2 short sentences of cross-area insight: connect what's moving the right way with what's slipping (e.g. "gym is up this fortnight while screen time is creeping back up").
Respect each metric's natural direction (more sleep/muscle good; less screen time good). Use only the data given; never invent numbers. Warm, never shaming. Sentence case. No emoji, no markdown.`;

const NEXT_SYSTEM = `You are Planizmo's assistant. Given the user's remaining items for today (incomplete trackers and calendar items), suggest the single best next thing to do right now, in one short sentence, and say briefly why. Ground it in the items given; if nothing remains, congratulate them gently. Sentence case, no emoji.`;

function avg(nums: number[]): number | null {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

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
  const mode = body.mode === "next" ? "next" : "insight";
  const tz = await getMyTimezone();
  const today = todayInTimeZone(tz);

  /* ----- what should I do now ----- */
  if (mode === "next") {
    const widgets = await listMyWidgets();
    const [todayLogs, events] = await Promise.all([getTodayLogs(today), listEventsBetween(today, today)]);
    const doneByWidget = new Map(todayLogs.map((l) => [l.widgetId, l.completed]));
    const asOf = new Date(`${today}T00:00:00Z`);
    const pendingTrackers = widgets
      .filter((w) => ["habit", "counter", "health", "reading"].includes(w.type) && isScheduledToday(w.schedule, asOf) && !doneByWidget.get(w.id))
      .map((w) => w.title);
    const pendingEvents = events.filter((e) => !e.completed).map((e) => ({ title: e.title, at: e.startTime ? e.startTime.slice(0, 5) : null }));

    if (pendingTrackers.length === 0 && pendingEvents.length === 0) {
      return NextResponse.json({ ok: true, suggestion: "You're all caught up for today — nice work. A little rest counts too." });
    }
    if (!hasDeepSeekKey()) {
      const first = pendingEvents[0]?.title ?? pendingTrackers[0];
      return NextResponse.json({ ok: true, suggestion: `Next up: ${first}.` });
    }
    const messages: ChatMsg[] = [
      { role: "system", content: NEXT_SYSTEM },
      { role: "user", content: JSON.stringify({ today, pendingTrackers, pendingEvents }) },
    ];
    try {
      const suggestion = await callDeepSeek(messages, 120, { timeoutMs: 15_000 });
      return NextResponse.json({ ok: true, suggestion });
    } catch {
      const first = pendingEvents[0]?.title ?? pendingTrackers[0];
      return NextResponse.json({ ok: true, suggestion: `Next up: ${first}.` });
    }
  }

  /* ----- cross-area insight ----- */
  const since = addDays(today, -28);
  const [widgets, logs, workouts, metrics, txns, goals] = await Promise.all([
    listMyWidgets(),
    getLogsSince(since),
    listRecentWorkouts(20),
    getBodyMetricsSince(addDays(today, -30)),
    getTransactionsSince(addDays(today, -30)),
    listGoals(),
  ]);

  const mid = addDays(today, -14);
  const trackers = widgets
    .filter((w) => ["counter", "health", "reading", "mood"].includes(w.type))
    .map((w) => {
      const recent = logs.filter((l) => l.widgetId === w.id && l.date >= mid && l.value != null).map((l) => Number(l.value));
      const prior = logs.filter((l) => l.widgetId === w.id && l.date < mid && l.value != null).map((l) => Number(l.value));
      const r = avg(recent), p = avg(prior);
      if (r == null && p == null) return null;
      return { title: w.title, unit: w.unit, recentAvg: r == null ? null : Math.round(r * 10) / 10, priorAvg: p == null ? null : Math.round(p * 10) / 10 };
    })
    .filter(Boolean);

  const weights = metrics.map((m) => (m.weight == null ? null : Number(m.weight))).filter((v): v is number => v != null);
  let income = 0, expense = 0;
  for (const t of txns) { if (t.type === "income") income += Number(t.amount); else expense += Number(t.amount); }

  const context = {
    today,
    trackers,
    gym: { workoutsLast14: workouts.filter((w) => w.date >= mid).length, weightFirst: weights[0] ?? null, weightLatest: weights[weights.length - 1] ?? null },
    finance: txns.length ? { net30: Math.round(income - expense) } : null,
    goals: goals.filter((g) => g.status === "active").map((g) => ({ title: g.title, progressPct: g.progressPct })),
  };

  const hasAny = trackers.length || context.gym.workoutsLast14 || weights.length || txns.length || context.goals.length;
  if (!hasAny) {
    return NextResponse.json({ ok: true, insight: "Once you log a few days across your trackers, gym and finances, I'll point out what's trending up and what needs attention." });
  }
  if (!hasDeepSeekKey()) {
    const up = trackers.find((t) => t && t.recentAvg != null && t.priorAvg != null && t.recentAvg > t.priorAvg);
    return NextResponse.json({ ok: true, insight: up ? `${up.title} is trending up versus the previous two weeks — keep it going.` : "You're building a steady log — keep it up and trends will sharpen." });
  }
  const messages: ChatMsg[] = [
    { role: "system", content: INSIGHT_SYSTEM },
    { role: "user", content: JSON.stringify(context) },
  ];
  try {
    const insight = await callDeepSeek(messages, 160, { timeoutMs: 18_000 });
    return NextResponse.json({ ok: true, insight });
  } catch {
    return NextResponse.json({ ok: true, insight: "I couldn't generate an insight just now — your data is safe, try again in a moment." });
  }
}

import { NextResponse } from "next/server";
import {
  getBodyMetricsSince,
  getMyTimezone,
  getSetsForWorkoutIds,
  listGoals,
  listRecentWorkouts,
  requireUserId,
  UnauthenticatedError,
} from "@/lib/db/scoped";
import { todayInTimeZone } from "@/lib/widgets/date";
import { addDays } from "@/lib/widgets/streak";
import { callDeepSeek, hasDeepSeekKey, type ChatMsg } from "@/lib/assistant/deepseek";
import { allowRequest } from "@/lib/assistant/ratelimit";

export const runtime = "nodejs";

const SYSTEM = `You are a calm, encouraging strength & conditioning coach inside a personal dashboard.
You are given JSON with the user's recent workouts, body-metric trend, and goals.
Suggest their NEXT workout. Rules:
- Ground everything in the data given. Never invent workouts or numbers they didn't log.
- Balance muscle groups against what they trained recently; nudge gentle progressive overload.
- If data is thin, suggest a sensible, approachable starting session and say why.
- Be specific: name 3-5 exercises with rough sets x reps. Keep it to ~120 words.
- Warm, never shaming. Sentence case. No markdown headers, no emoji.`;

function fallback(hasWorkouts: boolean): string {
  return hasWorkouts
    ? "Based on your recent sessions, a balanced full-body day works well next: squats 3×8, bench or push-ups 3×10, a hinge like Romanian deadlifts 3×8, rows 3×10, and a short core finisher. Add a little weight or one rep where last time felt easy."
    : "A simple, approachable first session: goblet squats 3×8, push-ups 3×8, dumbbell rows 3×10, glute bridges 3×12, and a 60-second plank. Focus on form and finishing feeling like you could do a little more — that's your baseline to build from.";
}

export async function POST() {
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

  const tz = await getMyTimezone();
  const today = todayInTimeZone(tz);
  const since = addDays(today, -60);

  const [recent, metrics, goals] = await Promise.all([
    listRecentWorkouts(8),
    getBodyMetricsSince(since),
    listGoals(),
  ]);
  const sets = await getSetsForWorkoutIds(recent.map((w) => w.id));

  const workouts = recent.map((w) => ({
    date: w.date,
    name: w.name,
    durationMin: w.durationMin,
    exercises: sets
      .filter((s) => s.workoutId === w.id)
      .map((s) => ({ exercise: s.exercise, sets: s.sets, reps: s.reps, weight: s.weight == null ? null : Number(s.weight) })),
  }));

  const trend = (key: "weight" | "bodyFatPct" | "muscleMass") => {
    const pts = metrics.map((m) => (m[key] == null ? null : Number(m[key]))).filter((v): v is number => v != null);
    if (pts.length === 0) return null;
    return { latest: pts[pts.length - 1], first: pts[0], points: pts.length };
  };

  const context = {
    today,
    workouts,
    body: { weight: trend("weight"), bodyFatPct: trend("bodyFatPct"), muscleMass: trend("muscleMass") },
    goals: goals.filter((g) => g.status === "active").map((g) => ({ title: g.title, nextStep: g.nextStep })),
  };

  if (!hasDeepSeekKey()) {
    return NextResponse.json({ ok: true, suggestion: fallback(workouts.length > 0), model: false });
  }

  const messages: ChatMsg[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: JSON.stringify(context) },
  ];
  try {
    const suggestion = await callDeepSeek(messages, 360, { timeoutMs: 20_000 });
    return NextResponse.json({ ok: true, suggestion, model: true });
  } catch {
    return NextResponse.json({ ok: true, suggestion: fallback(workouts.length > 0), model: false });
  }
}

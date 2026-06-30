import { NextResponse } from "next/server";
import { requireUserId, UnauthenticatedError } from "@/lib/db/scoped";
import { callDeepSeek, hasDeepSeekKey, type ChatMsg } from "@/lib/assistant/deepseek";
import { allowRequest } from "@/lib/assistant/ratelimit";

export const runtime = "nodejs";

const SYSTEM = `You are Planizmo's weekly reviewer. Given a JSON summary of the user's week (consistency, workouts, sleep, tracker completion, goal progress, and the prior week for comparison), produce an honest read.
Return ONLY this JSON:
{ "improved": "...", "slipped": "...", "fix": "...", "truth": "..." }
- improved: the single clearest thing that got better (with the number).
- slipped: the clearest thing that got worse or stayed stuck.
- fix: the one highest-leverage change for next week — concrete and small.
- truth: one uncomfortable but fair observation, said kindly.
Ground every line in the numbers given. No markdown, no preamble.`;

type Card = { improved: string; slipped: string; fix: string; truth: string };

function fallback(m: Record<string, number>): Card {
  return {
    improved: m.workouts > 0 ? `You logged ${m.workouts} workout${m.workouts === 1 ? "" : "s"} this week.` : "You kept showing up to your trackers.",
    slipped: m.consistency < 60 ? `Consistency sat at ${m.consistency}% — some scheduled items slipped.` : "Sleep was uneven on a couple of nights.",
    fix: "Protect one focus block early in the day before anything else.",
    truth: m.consistency < 50 ? "The plan is good; the follow-through is where it's breaking." : "You're close — the gap is consistency, not capability.",
  };
}

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (e) {
    if (e instanceof UnauthenticatedError) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    throw e;
  }
  if (!allowRequest(userId)) return NextResponse.json({ ok: false, error: "Give me a moment." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { metrics?: Record<string, number> };
  const metrics = body.metrics ?? {};

  if (!hasDeepSeekKey()) return NextResponse.json({ ok: true, card: fallback(metrics), model: false });

  const messages: ChatMsg[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: JSON.stringify(metrics) },
  ];
  try {
    const raw = await callDeepSeek(messages, 300, { json: true, timeoutMs: 20_000 });
    const parsed = JSON.parse(raw) as Partial<Card>;
    const card: Card = {
      improved: parsed.improved || fallback(metrics).improved,
      slipped: parsed.slipped || fallback(metrics).slipped,
      fix: parsed.fix || fallback(metrics).fix,
      truth: parsed.truth || fallback(metrics).truth,
    };
    return NextResponse.json({ ok: true, card, model: true });
  } catch {
    return NextResponse.json({ ok: true, card: fallback(metrics), model: false });
  }
}

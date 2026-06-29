import { NextResponse } from "next/server";
import {
  addCalendarEvent,
  getMyTimezone,
  listGoals,
  listMyWidgets,
  requireUserId,
  UnauthenticatedError,
} from "@/lib/db/scoped";
import { todayInTimeZone } from "@/lib/widgets/date";
import { addDays } from "@/lib/widgets/streak";
import { callDeepSeek, hasDeepSeekKey, type ChatMsg } from "@/lib/assistant/deepseek";
import { allowRequest } from "@/lib/assistant/ratelimit";
import type { CalEventType, ClientEvent } from "@/lib/calendar/types";

export const runtime = "nodejs";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const TYPES: CalEventType[] = ["block", "event", "task", "habit"];

const SYSTEM = `You are Planizmo's planner ("Jarvis"). Turn the user's request into concrete calendar items.

You are given: today's date, a 2-week window [windowStart, windowEnd], the user's habits, and their active goals.
Return ONLY this JSON:
{ "events": [ { "title": "...", "date": "YYYY-MM-DD", "start": "HH:MM" | null, "end": "HH:MM" | null, "type": "block" | "event" | "task" | "habit" } ] }

Rules:
- Every date MUST be within [windowStart, windowEnd]. Use 24-hour times.
- Spread recurring requests across days (e.g. "gym 5x" -> 5 separate dated items as type "habit").
- Use "block" for focus/work blocks, "event" for meetings/appointments, "task" for to-dos (start/end may be null), "habit" for recurring personal habits.
- Be realistic: don't overpack a day. Ground titles in what they asked and their goals; never invent unrelated items.
- Output JSON only — no prose, no code fences.`;

type RawEvent = { title?: unknown; date?: unknown; start?: unknown; end?: unknown; type?: unknown };

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
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ ok: false, error: "Tell me what to plan." }, { status: 400 });
  if (text.length > 800) return NextResponse.json({ ok: false, error: "That's a bit long — keep it focused." }, { status: 400 });
  if (!hasDeepSeekKey()) return NextResponse.json({ ok: false, error: "AI planning isn't configured (no model key)." }, { status: 503 });

  const tz = await getMyTimezone();
  const today = todayInTimeZone(tz);
  const windowStart = typeof body.windowStart === "string" && DATE_RE.test(body.windowStart) ? body.windowStart : today;
  const windowEnd = addDays(windowStart, 13);

  const [widgets, goals] = await Promise.all([listMyWidgets(), listGoals()]);
  const context = {
    today,
    windowStart,
    windowEnd,
    habits: widgets.filter((w) => w.type === "habit").map((w) => ({ title: w.title, schedule: w.schedule, target: w.target })),
    goals: goals.filter((g) => g.status === "active").map((g) => ({ title: g.title, nextStep: g.nextStep, targetDate: g.targetDate })),
  };

  const messages: ChatMsg[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: JSON.stringify({ request: text, ...context }) },
  ];

  let raw: string;
  try {
    raw = await callDeepSeek(messages, 900, { json: true, timeoutMs: 22_000 });
  } catch {
    return NextResponse.json({ ok: false, error: "Couldn't build a plan just now — try again." }, { status: 502 });
  }

  let parsed: { events?: RawEvent[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "I couldn't structure that plan — try rephrasing." }, { status: 502 });
  }

  const created: ClientEvent[] = [];
  for (const e of (Array.isArray(parsed.events) ? parsed.events : []).slice(0, 40)) {
    const title = typeof e.title === "string" ? e.title.trim().slice(0, 120) : "";
    const date = typeof e.date === "string" && DATE_RE.test(e.date) ? e.date : null;
    if (!title || !date) continue;
    if (date < windowStart || date > windowEnd) continue; // never schedule outside the window
    const type: CalEventType = typeof e.type === "string" && TYPES.includes(e.type as CalEventType) ? (e.type as CalEventType) : "event";
    const start = typeof e.start === "string" && TIME_RE.test(e.start) ? e.start : null;
    const end = typeof e.end === "string" && TIME_RE.test(e.end) ? e.end : null;
    const row = await addCalendarEvent({ title, date, startTime: start, endTime: end, type, source: "ai" });
    created.push({
      id: row.id,
      title: row.title,
      date: row.date,
      startTime: row.startTime ? row.startTime.slice(0, 5) : null,
      endTime: row.endTime ? row.endTime.slice(0, 5) : null,
      type: row.type,
      source: row.source,
      completed: row.completed,
      linkedWidgetId: row.linkedWidgetId,
    });
  }

  return NextResponse.json({ ok: true, created, count: created.length });
}

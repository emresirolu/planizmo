import "server-only";
import { callDeepSeek, hasDeepSeekKey, type ChatMsg } from "@/lib/assistant/deepseek";
import { buildWeekContext, WEEKDAYS, type WeekContext } from "./context";
import { localWeekPlan } from "./fallback";
import type { PlanDay, PlanItem, PlanItemKind, WeekPlan } from "./types";

const PLAN_SYSTEM_PREFIX = `You are Planizmo's weekly planner — a calm personal chief of staff.

You receive JSON context (the user's habits and their schedules, their checklist routines, existing tasks with due dates this week, and current streaks) plus a free-form brain-dump. You lay out a realistic Monday–Sunday week.

Rules:
- Place each habit on the days its schedule allows: "every day" = all 7; "weekdays (Mon–Fri)" = Mon–Fri only; "N× this week (flexible days)" = spread N days across the week, not all 7.
- Place existing tasks on their due date (or earlier if it helps).
- Distribute the brain-dump's new work sensibly across the week as task or note items; keep each day realistic and not overloaded (aim for a handful of items per day, lighter on weekends).
- NEVER invent habits, tasks, numbers, streaks or widgets that are not in the context. Use ref_widget_id only with ids present in the context; otherwise null.
- Rationale: one short, warm, non-shaming sentence. Sentence case. No emoji.

Output ONLY valid JSON of exactly this shape (7 day objects, Monday first):
{"week_start":"YYYY-MM-DD","days":[{"date":"YYYY-MM-DD","weekday":"Mon","summary":"one calm line","items":[{"kind":"habit|task|checklist|note","title":"...","ref_widget_id":null,"due_date":null,"rationale":"..."}]}]}`;

const KINDS: PlanItemKind[] = ["habit", "task", "checklist", "note"];

export async function generateWeekPlan(
  weekStart: string,
  brainDump: string,
): Promise<WeekPlan> {
  const ctx = await buildWeekContext(weekStart);

  if (!hasDeepSeekKey()) return localWeekPlan(ctx, brainDump);

  try {
    const messages: ChatMsg[] = [
      { role: "system", content: PLAN_SYSTEM_PREFIX },
      {
        role: "user",
        content: `Context for the week starting ${weekStart}:\n${JSON.stringify(ctx)}\n\nBrain-dump:\n${brainDump || "(none)"}\n\nReturn the week plan JSON now.`,
      },
    ];
    const raw = await callDeepSeek(messages, 1600, { json: true, timeoutMs: 28_000 });
    const parsed = JSON.parse(raw) as unknown;
    return normalize(parsed, ctx);
  } catch {
    return localWeekPlan(ctx, brainDump);
  }
}

/** Coerce the model output to a safe, grounded 7-day plan. */
function normalize(raw: unknown, ctx: WeekContext): WeekPlan {
  const validWidgetIds = new Set<string>([
    ...ctx.habits.map((h) => h.ref_widget_id),
    ...ctx.checklists.map((c) => c.ref_widget_id),
  ]);
  const rawDays = Array.isArray((raw as { days?: unknown[] })?.days)
    ? ((raw as { days: unknown[] }).days as Record<string, unknown>[])
    : [];
  const byDate = new Map<string, Record<string, unknown>>();
  for (const d of rawDays) {
    if (d && typeof d.date === "string") byDate.set(d.date, d);
  }

  const days: PlanDay[] = ctx.days.map((d, i) => {
    const rd = byDate.get(d.date) ?? {};
    const rawItems = Array.isArray(rd.items) ? (rd.items as Record<string, unknown>[]) : [];
    const items: PlanItem[] = rawItems
      .slice(0, 10)
      .map((it) => {
        const kind = KINDS.includes(it.kind as PlanItemKind)
          ? (it.kind as PlanItemKind)
          : "note";
        const ref =
          typeof it.ref_widget_id === "string" && validWidgetIds.has(it.ref_widget_id)
            ? it.ref_widget_id
            : null;
        const due =
          typeof it.due_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(it.due_date)
            ? it.due_date
            : null;
        return {
          id: crypto.randomUUID(),
          kind,
          title: String(it.title ?? "").trim().slice(0, 120) || "Untitled",
          ref_widget_id: ref,
          due_date: due,
          rationale: String(it.rationale ?? "").trim().slice(0, 200),
        };
      })
      .filter((it) => it.title !== "Untitled" || true);

    return {
      date: d.date,
      weekday: WEEKDAYS[i],
      summary: String(rd.summary ?? "").trim().slice(0, 160),
      items,
    };
  });

  return { week_start: ctx.week_start, days };
}

import type { WeekContext } from "./context";
import type { PlanDay, PlanItem, WeekPlan } from "./types";

/**
 * Deterministic, grounded week plan used when DEEPSEEK_API_KEY is missing or the
 * API errors. Places habits on their scheduled days, tasks on their due dates,
 * and spreads brain-dump lines across the week — never invents widgets/numbers.
 */
export function localWeekPlan(ctx: WeekContext, brainDump: string): WeekPlan {
  const days: PlanDay[] = ctx.days.map((d) => ({
    date: d.date,
    weekday: d.weekday,
    summary: "",
    items: [],
  }));
  const byDate = new Map(days.map((d) => [d.date, d]));

  const isWeekday = (weekday: string) =>
    ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday);

  // habits → scheduled days
  for (const h of ctx.habits) {
    if (h.schedule === "times_per_week") {
      // spread N across the week (Mon, Wed, Fri, ...)
      const n = h.target ?? 1;
      const picks = pickSpread(7, n);
      picks.forEach((idx) =>
        byDate.get(ctx.days[idx].date)!.items.push(
          item("habit", h.title, h.ref_widget_id, null, `${h.title} — ${h.when}.`),
        ),
      );
    } else {
      for (const d of days) {
        if (h.schedule === "weekdays" && !isWeekday(d.weekday)) continue;
        d.items.push(item("habit", h.title, h.ref_widget_id, null, `${h.title} — ${h.when}.`));
      }
    }
  }

  // checklists → every day (they reset daily)
  for (const c of ctx.checklists) {
    for (const d of days) {
      d.items.push(
        item("checklist", c.title, c.ref_widget_id, null, "Your daily routine."),
      );
    }
  }

  // existing tasks → their due dates
  for (const t of ctx.tasksThisWeek) {
    const d = byDate.get(t.due_date);
    if (d) d.items.push(item("task", t.title, null, t.due_date, "Due this day."));
  }

  // brain-dump lines → spread as new tasks across mid-week
  const lines = brainDump
    .split(/\n|;|•|\-\s/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2)
    .slice(0, 10);
  lines.forEach((line, i) => {
    const idx = pickSpread(7, lines.length)[i] ?? i % 7;
    const d = days[idx];
    d.items.push(item("task", line.slice(0, 80), null, d.date, "From your brain-dump."));
  });

  for (const d of days) {
    d.summary =
      d.items.length === 0
        ? "A lighter day — room to breathe."
        : `${d.items.length} thing${d.items.length === 1 ? "" : "s"} to keep the rhythm.`;
  }

  return { week_start: ctx.week_start, days };
}

function item(
  kind: PlanItem["kind"],
  title: string,
  ref: string | null,
  due: string | null,
  rationale: string,
): PlanItem {
  return {
    id: crypto.randomUUID(),
    kind,
    title,
    ref_widget_id: ref,
    due_date: due,
    rationale,
  };
}

/** Pick `n` roughly-evenly-spread indices in [0, len). */
function pickSpread(len: number, n: number): number[] {
  if (n <= 0) return [];
  if (n >= len) return Array.from({ length: len }, (_, i) => i);
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(Math.round((i * (len - 1)) / (n - 1)));
  return Array.from(new Set(out));
}

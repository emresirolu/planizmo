import "server-only";
import {
  listChecklistItems,
  listMyWidgets,
  listStreaks,
  listTasks,
} from "@/lib/db/scoped";
import { addDays } from "@/lib/widgets/streak";
import { WEEKDAYS } from "./types";

export { WEEKDAYS };

function scheduleLabel(schedule: string, target: number | null): string {
  if (schedule === "weekdays") return "weekdays (Mon–Fri)";
  if (schedule === "times_per_week")
    return `${target ?? 1}× this week (flexible days)`;
  return "every day";
}

export type WeekContext = {
  week_start: string;
  week_end: string;
  days: Array<{ date: string; weekday: string }>;
  habits: Array<{
    ref_widget_id: string;
    title: string;
    type: string;
    schedule: string;
    when: string;
    target: number | null;
    unit: string | null;
    currentStreak?: number;
    strength?: number;
  }>;
  checklists: Array<{ ref_widget_id: string; title: string; items: string[] }>;
  tasksThisWeek: Array<{ title: string; due_date: string }>;
};

export async function buildWeekContext(weekStart: string): Promise<WeekContext> {
  const weekEnd = addDays(weekStart, 6);
  const days = Array.from({ length: 7 }, (_, i) => ({
    date: addDays(weekStart, i),
    weekday: WEEKDAYS[i],
  }));

  const [widgets, items, tasks, streaks] = await Promise.all([
    listMyWidgets(),
    listChecklistItems(),
    listTasks(),
    listStreaks(),
  ]);

  const streakByWidget = new Map(streaks.map((s) => [s.widgetId, s]));

  const habits = widgets
    .filter((w) => w.type !== "tasks" && w.type !== "checklist")
    .map((w) => {
      const s = streakByWidget.get(w.id);
      return {
        ref_widget_id: w.id,
        title: w.title,
        type: w.type,
        schedule: w.schedule,
        when: scheduleLabel(w.schedule, w.target ?? null),
        target: w.target ?? null,
        unit: w.unit ?? null,
        ...(s
          ? { currentStreak: s.currentStreak, strength: Number(s.strength) }
          : {}),
      };
    });

  const itemsByWidget = new Map<string, string[]>();
  for (const it of items) {
    const arr = itemsByWidget.get(it.widgetId) ?? [];
    arr.push(it.label);
    itemsByWidget.set(it.widgetId, arr);
  }
  const checklists = widgets
    .filter((w) => w.type === "checklist")
    .map((w) => ({
      ref_widget_id: w.id,
      title: w.title,
      items: itemsByWidget.get(w.id) ?? [],
    }));

  const tasksThisWeek = tasks
    .filter(
      (t) =>
        !t.completed &&
        t.dueDate != null &&
        t.dueDate >= weekStart &&
        t.dueDate <= weekEnd,
    )
    .map((t) => ({ title: t.title, due_date: t.dueDate as string }))
    .slice(0, 30);

  return {
    week_start: weekStart,
    week_end: weekEnd,
    days,
    habits,
    checklists,
    tasksThisWeek,
  };
}

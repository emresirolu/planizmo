import "server-only";
import { loadDashboard } from "@/lib/widgets/dashboard-data";
import { getHealthSnapshot } from "@/lib/db/scoped";
import { isScheduledToday } from "@/lib/widgets/logic";

/**
 * Compact, grounded snapshot of the user's day for the assistant. Kept small on
 * purpose — enough to answer specifically, not the whole DB. Health (sleep/
 * steps) is a clean slot for M7.
 */
export type AssistantContext = {
  date: string;
  dayOfWeek: string;
  timezone: string;
  totals: { scheduledToday: number; completedToday: number };
  widgets: Array<{
    title: string;
    type: string;
    schedule: string;
    scheduledToday: boolean;
    target?: number | null;
    unit?: string | null;
    value?: number | null;
    completed: boolean;
    currentStreak?: number;
    strength?: number;
  }>;
  checklists: Array<{ title: string; done: number; total: number; completed: boolean }>;
  tasks: {
    dueToday: string[];
    overdue: Array<{ title: string; due: string }>;
    openCount: number;
  };
  health: {
    lastNightSleepHours: number | null;
    todaySteps: number | null;
  } | null;
};

export async function buildAssistantContext(): Promise<{
  context: AssistantContext;
  today: string;
}> {
  const d = await loadDashboard();
  const asOf = new Date(`${d.today}T00:00:00Z`);
  const dayOfWeek = asOf.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

  const trackWidgets = d.widgets.filter(
    (w) => w.type !== "tasks" && w.type !== "checklist",
  );
  const widgets = trackWidgets.map((w) => {
    const log = d.logs[w.id] ?? { value: null, completed: false };
    const st = d.streaks[w.id];
    return {
      title: w.title,
      type: w.type,
      schedule: w.schedule,
      scheduledToday: isScheduledToday(w.schedule, asOf),
      target: w.target,
      unit: w.unit,
      value: log.value,
      completed: log.completed,
      ...(st ? { currentStreak: st.currentStreak, strength: st.strength } : {}),
    };
  });

  const checklists = d.widgets
    .filter((w) => w.type === "checklist")
    .map((w) => {
      const cl = d.checklists[w.id];
      const total = cl?.items.length ?? 0;
      const done = cl?.checkedToday.length ?? 0;
      return { title: w.title, done, total, completed: total > 0 && done >= total };
    });

  const allTasks = Object.values(d.tasks).flat();
  const dueToday = allTasks
    .filter((t) => !t.completed && t.dueDate === d.today)
    .map((t) => t.title)
    .slice(0, 8);
  const overdue = allTasks
    .filter((t) => !t.completed && t.dueDate && t.dueDate < d.today)
    .map((t) => ({ title: t.title, due: t.dueDate as string }))
    .slice(0, 8);
  const openCount = allTasks.filter((t) => !t.completed).length;

  const scheduledWidgets = widgets.filter((w) => w.scheduledToday);
  const scheduledChecklists = d.widgets
    .filter((w) => w.type === "checklist" && isScheduledToday(w.schedule, asOf))
    .map((w) => w.id);
  const scheduledToday = scheduledWidgets.length + scheduledChecklists.length;
  const completedToday =
    scheduledWidgets.filter((w) => w.completed).length +
    checklists.filter((c) => c.completed).length;

  const snap = await getHealthSnapshot(d.today);
  const health =
    snap.sleepHours == null && snap.steps == null
      ? null
      : { lastNightSleepHours: snap.sleepHours, todaySteps: snap.steps };

  return {
    today: d.today,
    context: {
      date: d.today,
      dayOfWeek,
      timezone: d.tz,
      totals: { scheduledToday, completedToday },
      widgets,
      checklists,
      tasks: { dueToday, overdue, openCount },
      health,
    },
  };
}

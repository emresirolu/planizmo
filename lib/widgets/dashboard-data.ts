import "server-only";
import {
  getLogsSince,
  getChecklistLogsSince,
  getMyProfile,
  getTodayLogs,
  listChecklistItems,
  listMyWidgets,
  listStreaks,
  listTasks,
  toClientWidget,
} from "@/lib/db/scoped";
import { todayInTimeZone } from "./date";
import { addDays, buildHeatmap, computeStreak } from "./streak";
import { isStreakType } from "./types";
import type {
  ChecklistItem,
  ClientWidget,
  HeatCell,
  LogState,
  StreakStats,
  Task,
} from "./types";

const WINDOW_DAYS = 120;

export type ChecklistData = { items: ChecklistItem[]; checkedToday: string[] };

export type DashboardData = {
  tz: string;
  today: string;
  widgets: ClientWidget[];
  logs: Record<string, LogState>;
  streaks: Record<string, StreakStats>;
  heatmaps: Record<string, HeatCell[]>;
  checklists: Record<string, ChecklistData>;
  tasks: Record<string, Task[]>;
};

export async function loadDashboard(): Promise<DashboardData> {
  const profile = await getMyProfile();
  const tz = profile?.timezone || "UTC";
  const today = todayInTimeZone(tz);
  const from = addDays(today, -WINDOW_DAYS);

  const [widgetRows, todays, sinceLogs, items, sinceChecklist, taskRows, streakRows] =
    await Promise.all([
      listMyWidgets(),
      getTodayLogs(today),
      getLogsSince(from),
      listChecklistItems(),
      getChecklistLogsSince(from),
      listTasks(),
      listStreaks(),
    ]);

  const widgets = widgetRows.map(toClientWidget);

  // today's per-widget log state
  const logs: Record<string, LogState> = {};
  for (const l of todays) {
    logs[l.widgetId] = {
      value: l.value != null ? Number(l.value) : null,
      completed: l.completed,
    };
  }

  // day-level completions per widget (from logs)
  const completed: Record<string, Set<string>> = {};
  for (const w of widgetRows) completed[w.id] = new Set();
  for (const l of sinceLogs) {
    if (l.completed) completed[l.widgetId]?.add(l.date);
  }

  // checklist items grouped + today's checked ids
  const itemsByWidget: Record<string, ChecklistItem[]> = {};
  for (const it of items) {
    (itemsByWidget[it.widgetId] ??= []).push({
      id: it.id,
      label: it.label,
      position: it.position,
    });
  }
  const checkedByWidget: Record<string, string[]> = {};
  const checklistCount: Record<string, number> = {}; // `${widgetId}|${date}` -> ticked count
  for (const cl of sinceChecklist) {
    if (!cl.completed) continue;
    const k = `${cl.widgetId}|${cl.date}`;
    checklistCount[k] = (checklistCount[k] ?? 0) + 1;
    if (cl.date === today) (checkedByWidget[cl.widgetId] ??= []).push(cl.itemId);
  }

  // checklist "all items ticked" days feed the completion set + today's state
  const checklists: Record<string, ChecklistData> = {};
  for (const w of widgetRows) {
    if (w.type !== "checklist") continue;
    const list = itemsByWidget[w.id] ?? [];
    const n = list.length;
    const set = completed[w.id];
    if (n > 0) {
      for (const [key, c] of Object.entries(checklistCount)) {
        const [wid, date] = key.split("|");
        if (wid === w.id && c >= n) set.add(date);
      }
    }
    const checkedToday = checkedByWidget[w.id] ?? [];
    checklists[w.id] = { items: list, checkedToday };
    logs[w.id] = {
      value: checkedToday.length,
      completed: n > 0 && checkedToday.length >= n,
    };
  }

  // streak stats + heatmaps (read-only; preserves stored longest high-water mark)
  const storedLongest: Record<string, number> = {};
  for (const s of streakRows) storedLongest[s.widgetId] = s.longestStreak;

  const streaks: Record<string, StreakStats> = {};
  const heatmaps: Record<string, HeatCell[]> = {};
  for (const w of widgetRows) {
    if (!isStreakType(w.type)) continue;
    const cd = completed[w.id];
    const res = computeStreak({
      schedule: w.schedule,
      target: w.target ?? null,
      completedDates: cd,
      asOf: today,
      storedLongest: storedLongest[w.id] ?? 0,
    });
    streaks[w.id] = {
      currentStreak: res.currentStreak,
      longestStreak: res.longestStreak,
      strength: res.strength,
    };
    heatmaps[w.id] = buildHeatmap(cd, w.schedule, today, 12);
  }

  // tasks grouped by widget
  const tasks: Record<string, Task[]> = {};
  for (const t of taskRows) {
    if (!t.widgetId) continue;
    (tasks[t.widgetId] ??= []).push({
      id: t.id,
      title: t.title,
      notes: t.notes,
      dueDate: t.dueDate,
      completed: t.completed,
      position: t.position,
    });
  }

  return { tz, today, widgets, logs, streaks, heatmaps, checklists, tasks };
}

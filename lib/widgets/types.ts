export type WidgetType =
  | "habit"
  | "counter"
  | "mood"
  | "health"
  | "reading"
  | "checklist"
  | "tasks";
export type Schedule = "daily" | "weekdays" | "times_per_week";
export type WidgetSize = "1x1" | "2x1" | "2x2";

/** Types that participate in streaks/strength (excludes mood and tasks). */
export const STREAK_TYPES: WidgetType[] = [
  "habit",
  "counter",
  "reading",
  "health",
];
export function isStreakType(type: WidgetType): boolean {
  return STREAK_TYPES.includes(type);
}

/** The widget shape the client UI works with (no Date objects / DB internals). */
export type ClientWidget = {
  id: string;
  type: WidgetType;
  title: string;
  icon: string;
  schedule: Schedule;
  target: number | null;
  unit: string | null;
  size: WidgetSize;
  position: number;
};

/** Today's logged state for a widget. */
export type LogState = {
  value: number | null;
  completed: boolean;
};

/** The interaction a tap performs against a widget's log. */
export type LogOp =
  | { kind: "toggle" }
  | { kind: "increment"; delta: number }
  | { kind: "set"; value: number };

export type ChecklistItem = {
  id: string;
  label: string;
  position: number;
};

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  dueDate: string | null; // YYYY-MM-DD
  completed: boolean;
  position: number;
};

/** Persisted streak/strength numbers for a widget. */
export type StreakStats = {
  currentStreak: number;
  longestStreak: number;
  strength: number; // 0–100
};

/** A day's completion for the heatmap. */
export type HeatCell = { date: string; level: 0 | 1 | 2 | 3 | 4 };

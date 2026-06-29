export type CalEventType = "block" | "event" | "task" | "habit";
export type CalSource = "manual" | "ai";

export type ClientEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string | null; // HH:MM
  endTime: string | null;
  type: CalEventType;
  source: CalSource;
  completed: boolean;
  linkedWidgetId: string | null;
};

/** A recurring habit projected onto a given day (derived, not stored). */
export type HabitOnDay = {
  widgetId: string;
  title: string;
  completed: boolean;
};

export const TYPE_COLORS: Record<CalEventType, string> = {
  block: "#7c8cff",
  event: "var(--accent)",
  task: "#e0a53d",
  habit: "#3fb984",
};

/** "HH:MM:SS" or "HH:MM" -> "9:30am". Returns "" for null. */
export function fmtTime(t: string | null): string {
  if (!t) return "";
  const [hRaw, m] = t.split(":");
  let h = Number(hRaw);
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return m === "00" ? `${h}${ampm}` : `${h}:${m}${ampm}`;
}

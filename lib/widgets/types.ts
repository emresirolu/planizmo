export type WidgetType = "habit" | "counter" | "mood" | "health" | "reading";
export type Schedule = "daily" | "weekdays" | "times_per_week";
export type WidgetSize = "1x1" | "2x1";

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

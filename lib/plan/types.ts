export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type PlanItemKind = "habit" | "task" | "checklist" | "note";

export type PlanItem = {
  id: string;
  kind: PlanItemKind;
  title: string;
  ref_widget_id: string | null;
  due_date: string | null;
  rationale: string;
  /** Set once a concrete task has been created for a task item (idempotency). */
  taskId?: string | null;
};

export type PlanDay = {
  date: string; // YYYY-MM-DD
  weekday: string; // Mon..Sun
  summary: string;
  items: PlanItem[];
};

export type WeekPlan = {
  week_start: string;
  days: PlanDay[];
};

export type WeekPlanStatus = "draft" | "approved";

import type { ClientWidget, LogOp, LogState, Schedule } from "./types";

/**
 * Pure transition function shared by the optimistic client and the server
 * action, so the instant UI update and the persisted result always agree.
 */
export function nextLogState(
  widget: Pick<ClientWidget, "type" | "target">,
  prev: LogState,
  op: LogOp,
): LogState {
  const target = widget.target ?? null;

  switch (op.kind) {
    case "toggle":
      return { value: prev.value, completed: !prev.completed };

    case "increment": {
      const next = Math.max(0, (prev.value ?? 0) + op.delta);
      return {
        value: next,
        completed: target != null ? next >= target : prev.completed,
      };
    }

    case "set": {
      if (widget.type === "mood") return { value: op.value, completed: true };
      return {
        value: op.value,
        completed: target != null ? op.value >= target : true,
      };
    }
  }
}

/** The step a single +/- tap moves a stepper widget. Adapts to target size so
 *  big counters (steps, protein) aren't a tapping marathon — typed entry stays
 *  the primary interaction for those (see isLargeTarget). */
export function stepFor(
  widget: Pick<ClientWidget, "type" | "unit" | "target">,
): number {
  if (widget.type === "health") {
    if (widget.unit === "hours") return 0.5;
    if (widget.unit === "steps") return 500;
  }
  const t = widget.target ?? 0;
  if (t >= 5000) return 500;
  if (t >= 500) return 100;
  if (t >= 100) return 10; // e.g. protein 180g → +10
  if (t >= 30) return 5;
  return 1;
}

/** Counters with a sizeable target → typed numeric entry is the primary action. */
export function isLargeTarget(target: number | null | undefined): boolean {
  return (target ?? 0) >= 30;
}

/** How a widget is logged in the UI. Lists (checklist/tasks) have their own
 *  body UIs and are NOT steppers. */
export type InteractionMode = "toggle" | "stepper" | "scale" | "checklist" | "tasks";

export function interactionMode(type: ClientWidget["type"]): InteractionMode {
  if (type === "habit") return "toggle";
  if (type === "mood") return "scale";
  if (type === "checklist") return "checklist";
  if (type === "tasks") return "tasks";
  return "stepper"; // counter, health, reading
}

/** Is this widget expected to be completed *today*? Drives the overview ring. */
export function isScheduledToday(schedule: Schedule, date: Date): boolean {
  if (schedule === "weekdays") {
    const day = date.getDay(); // 0 = Sun, 6 = Sat
    return day >= 1 && day <= 5;
  }
  // "daily" and "times_per_week" both count toward today's ring.
  return true;
}

export const MOOD_LABELS = ["rough", "meh", "okay", "good", "great"] as const;

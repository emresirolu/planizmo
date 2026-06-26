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

/** The step a single tap moves a stepper widget (counter/health/reading). */
export function stepFor(
  widget: Pick<ClientWidget, "type" | "unit">,
): number {
  if (widget.type === "health") {
    if (widget.unit === "hours") return 0.5;
    if (widget.unit === "steps") return 500;
  }
  return 1;
}

/** How a widget is logged in the UI. */
export type InteractionMode = "toggle" | "stepper" | "scale";

export function interactionMode(type: ClientWidget["type"]): InteractionMode {
  if (type === "habit") return "toggle";
  if (type === "mood") return "scale";
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

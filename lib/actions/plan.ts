"use server";

import { revalidatePath } from "next/cache";
import {
  addTask,
  addWidget,
  approveWeekPlanRow,
  firstTasksWidget,
  getWeekPlan,
  listTasks,
} from "@/lib/db/scoped";
import type { PlanDay, WeekPlan } from "@/lib/plan/types";

type ApproveResult =
  | { ok: true; plan: WeekPlan }
  | { ok: false; error: string };

const norm = (s: string) => s.trim().toLowerCase();

/** Quick capture: drop a task into the user's tasks widget (create one if none). */
export async function quickCaptureTask(
  title: string,
): Promise<{ ok: boolean }> {
  const t = title.trim();
  if (!t) return { ok: false };
  try {
    let w = await firstTasksWidget();
    if (!w) {
      w = await addWidget({
        type: "tasks",
        title: "Inbox",
        icon: "tasks",
        schedule: "daily",
        target: null,
        unit: null,
        size: "2x2",
      });
    }
    await addTask({ widgetId: w.id, title: t.slice(0, 120) });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/lists");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/**
 * Approve a week plan: create concrete tasks for new task-items (idempotently),
 * persist any edits, and mark the row approved.
 *
 * Idempotency:
 *  - items already carrying a taskId are skipped;
 *  - new task-items are de-duplicated by title against existing open tasks and
 *    against tasks created earlier in the same run, so approving twice never
 *    duplicates a task.
 * Habits/checklists/notes are placements only — they never create tasks.
 */
export async function approveWeekPlan(
  weekStart: string,
  days: PlanDay[],
): Promise<ApproveResult> {
  try {
    const existingRow = await getWeekPlan(weekStart);
    if (!existingRow) return { ok: false, error: "No plan to approve yet" };

    // Resolve a tasks widget to attach plan tasks to (so they show on the dashboard).
    let tasksWidget = await firstTasksWidget();
    if (!tasksWidget) {
      tasksWidget = await addWidget({
        type: "tasks",
        title: "Planner",
        icon: "tasks",
        schedule: "daily",
        target: null,
        unit: null,
        size: "2x2",
      });
    }

    // Existing open tasks → title map (dedupe target).
    const open = await listTasks();
    const byTitle = new Map<string, string>();
    for (const t of open) if (!t.completed) byTitle.set(norm(t.title), t.id);

    const createdThisRun = new Map<string, string>();

    for (const day of days) {
      for (const item of day.items) {
        if (item.kind !== "task") continue;
        if (item.taskId) continue; // already materialised

        const key = norm(item.title);
        const existingId = byTitle.get(key) ?? createdThisRun.get(key);
        if (existingId) {
          item.taskId = existingId; // link, don't duplicate
          continue;
        }

        const created = await addTask({
          widgetId: tasksWidget.id,
          title: item.title,
          dueDate: item.due_date ?? day.date,
        });
        if (created) {
          item.taskId = created.id;
          createdThisRun.set(key, created.id);
        }
      }
    }

    const plan: WeekPlan = { week_start: weekStart, days };
    await approveWeekPlanRow(weekStart, plan);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/planner");
    return { ok: true, plan };
  } catch {
    return { ok: false, error: "Could not approve the plan" };
  }
}

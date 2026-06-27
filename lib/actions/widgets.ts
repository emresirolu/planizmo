"use server";

import { revalidatePath } from "next/cache";
import {
  addChecklistItem,
  addTask,
  addWidget,
  deleteTask,
  getLog,
  getMyPlan,
  getMyTimezone,
  getMyWidget,
  removeChecklistItem,
  removeWidget,
  saveLayout,
  setChecklistLog,
  setWidgetPositions,
  toClientWidget,
  updateChecklistItem,
  updateTask,
  updateWidget,
  upsertLog,
} from "@/lib/db/scoped";
import { getPreset } from "@/lib/widgets/catalog";
import { todayInTimeZone } from "@/lib/widgets/date";
import { nextLogState } from "@/lib/widgets/logic";
import { recomputeMyStreak } from "@/lib/widgets/streak-service";
import { can, UPGRADE_COPY } from "@/lib/billing/plan";
import {
  isStreakType,
  type ChecklistItem,
  type ClientWidget,
  type LogOp,
  type LogState,
  type Schedule,
  type StreakStats,
  type Task,
  type WidgetSize,
} from "@/lib/widgets/types";

async function currentDate(): Promise<string> {
  return todayInTimeZone(await getMyTimezone());
}

/* ---- add ---- */

type AddResult =
  | { ok: true; widget: ClientWidget }
  | { ok: false; error: string };

export async function addPresetWidget(key: string): Promise<AddResult> {
  const preset = getPreset(key);
  if (!preset || preset.custom) return { ok: false, error: "Unknown widget" };
  try {
    const w = await addWidget({
      type: preset.type,
      title: preset.title,
      icon: preset.icon,
      schedule: preset.schedule,
      target: preset.target,
      unit: preset.unit,
      size: preset.size,
    });
    revalidatePath("/dashboard");
    return { ok: true, widget: toClientWidget(w) };
  } catch {
    return { ok: false, error: "Could not add widget" };
  }
}

const SCHEDULES: Schedule[] = ["daily", "weekdays", "times_per_week"];
const SIZES: WidgetSize[] = ["1x1", "2x1", "2x2"];

export async function addCustomWidget(input: {
  title: string;
  unit: string;
  target: number | null;
  schedule: Schedule;
}): Promise<AddResult> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Give it a title" };
  if (!SCHEDULES.includes(input.schedule))
    return { ok: false, error: "Invalid schedule" };
  const target =
    input.target != null && Number.isFinite(input.target) && input.target > 0
      ? Math.round(input.target)
      : null;
  try {
    const w = await addWidget({
      type: "counter",
      title: title.slice(0, 60),
      icon: "counter",
      schedule: input.schedule,
      target,
      unit: input.unit.trim().slice(0, 20) || null,
      size: "1x1",
    });
    revalidatePath("/dashboard");
    return { ok: true, widget: toClientWidget(w) };
  } catch {
    return { ok: false, error: "Could not add widget" };
  }
}

/* ---- edit (A1) ---- */

export async function updateWidgetAction(
  widgetId: string,
  patch: {
    title?: string;
    target?: number | null;
    unit?: string | null;
    schedule?: Schedule;
    size?: WidgetSize;
  },
): Promise<
  { ok: true; widget: ClientWidget; streak: StreakStats | null } | { ok: false; error: string }
> {
  const clean: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (!t) return { ok: false, error: "Title can’t be empty" };
    clean.title = t.slice(0, 60);
  }
  if (patch.target !== undefined) {
    clean.target =
      patch.target != null && Number.isFinite(patch.target) && patch.target > 0
        ? Math.round(patch.target)
        : null;
  }
  if (patch.unit !== undefined)
    clean.unit = patch.unit ? patch.unit.trim().slice(0, 20) : null;
  if (patch.schedule !== undefined) {
    if (!SCHEDULES.includes(patch.schedule))
      return { ok: false, error: "Invalid schedule" };
    clean.schedule = patch.schedule;
  }
  if (patch.size !== undefined) {
    if (!SIZES.includes(patch.size)) return { ok: false, error: "Invalid size" };
    clean.size = patch.size;
  }

  try {
    const w = await updateWidget(widgetId, clean);
    if (!w) return { ok: false, error: "Widget not found" };
    const streak = isStreakType(w.type)
      ? await recomputeMyStreak(widgetId, await currentDate())
      : null;
    revalidatePath("/dashboard");
    return { ok: true, widget: toClientWidget(w), streak };
  } catch {
    return { ok: false, error: "Could not save changes" };
  }
}

/* ---- arrange: reorder + resize (Milestone 10) ---- */

export async function reorderWidgetsAction(
  orderedIds: string[],
): Promise<{ ok: boolean; upgrade?: boolean; error?: string }> {
  if (!can(await getMyPlan(), "customization"))
    return { ok: false, upgrade: true, error: UPGRADE_COPY.customization };
  try {
    await setWidgetPositions(orderedIds);
    await saveLayout({ flow: orderedIds }); // mirror to layouts.layout_json
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/habits");
    revalidatePath("/dashboard/lists");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function resizeWidgetAction(
  widgetId: string,
  size: WidgetSize,
): Promise<{ ok: boolean; upgrade?: boolean; error?: string }> {
  if (!can(await getMyPlan(), "customization"))
    return { ok: false, upgrade: true, error: UPGRADE_COPY.customization };
  if (!SIZES.includes(size)) return { ok: false };
  const w = await updateWidget(widgetId, { size });
  if (w) {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/habits");
    revalidatePath("/dashboard/lists");
  }
  return { ok: Boolean(w) };
}

export async function removeWidgetAction(
  widgetId: string,
): Promise<{ ok: boolean }> {
  try {
    const ok = await removeWidget(widgetId);
    if (ok) revalidatePath("/dashboard");
    return { ok };
  } catch {
    return { ok: false };
  }
}

/* ---- one-tap logging (+ live streak recompute) ---- */

type LogResult =
  | { ok: true; state: LogState; streak: StreakStats | null }
  | { ok: false; error: string };

export async function logWidget(
  widgetId: string,
  op: LogOp,
): Promise<LogResult> {
  try {
    const widget = await getMyWidget(widgetId);
    if (!widget) return { ok: false, error: "Widget not found" };

    const date = await currentDate();
    const existing = await getLog(widgetId, date);
    const prev: LogState = {
      value: existing?.value != null ? Number(existing.value) : null,
      completed: existing?.completed ?? false,
    };
    const next = nextLogState(
      { type: widget.type, target: widget.target ?? null },
      prev,
      op,
    );
    const row = await upsertLog(widgetId, date, next);

    const streak = isStreakType(widget.type)
      ? await recomputeMyStreak(widgetId, date)
      : null;

    return {
      ok: true,
      state: {
        value: row.value != null ? Number(row.value) : null,
        completed: row.completed,
      },
      streak,
    };
  } catch {
    return { ok: false, error: "Couldn’t save — try again" };
  }
}

/* ---- checklist (A2) ---- */

export async function addChecklistItemAction(
  widgetId: string,
  label: string,
): Promise<{ ok: true; item: ChecklistItem } | { ok: false; error: string }> {
  const l = label.trim();
  if (!l) return { ok: false, error: "Enter a label" };
  try {
    const item = await addChecklistItem(widgetId, l.slice(0, 80));
    if (!item) return { ok: false, error: "Widget not found" };
    revalidatePath("/dashboard");
    return {
      ok: true,
      item: { id: item.id, label: item.label, position: item.position },
    };
  } catch {
    return { ok: false, error: "Could not add item" };
  }
}

export async function renameChecklistItemAction(
  itemId: string,
  label: string,
): Promise<{ ok: boolean }> {
  const l = label.trim();
  if (!l) return { ok: false };
  const ok = await updateChecklistItem(itemId, l.slice(0, 80));
  if (ok) revalidatePath("/dashboard");
  return { ok };
}

export async function removeChecklistItemAction(
  itemId: string,
): Promise<{ ok: boolean }> {
  const ok = await removeChecklistItem(itemId);
  if (ok) revalidatePath("/dashboard");
  return { ok };
}

export async function toggleChecklistItemAction(
  itemId: string,
  completed: boolean,
): Promise<
  { ok: true; streak: StreakStats | null } | { ok: false; error: string }
> {
  try {
    const date = await currentDate();
    const res = await setChecklistLog(itemId, date, completed);
    if (!res) return { ok: false, error: "Item not found" };
    const streak = await recomputeMyStreak(res.widgetId, date);
    return { ok: true, streak };
  } catch {
    return { ok: false, error: "Couldn’t save — try again" };
  }
}

/* ---- tasks (A3) ---- */

function toClientTask(t: {
  id: string;
  title: string;
  notes: string | null;
  dueDate: string | null;
  completed: boolean;
  position: number;
}): Task {
  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    dueDate: t.dueDate,
    completed: t.completed,
    position: t.position,
  };
}

export async function addTaskAction(input: {
  widgetId: string;
  title: string;
  notes?: string;
  dueDate?: string | null;
}): Promise<{ ok: true; task: Task } | { ok: false; error: string }> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Enter a title" };
  const dueDate =
    input.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)
      ? input.dueDate
      : null;
  try {
    const t = await addTask({
      widgetId: input.widgetId,
      title: title.slice(0, 120),
      notes: input.notes?.trim() || null,
      dueDate,
    });
    if (!t) return { ok: false, error: "Widget not found" };
    revalidatePath("/dashboard");
    return { ok: true, task: toClientTask(t) };
  } catch {
    return { ok: false, error: "Could not add task" };
  }
}

export async function updateTaskAction(
  taskId: string,
  patch: { title?: string; notes?: string | null; dueDate?: string | null },
): Promise<{ ok: boolean }> {
  const clean: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (!t) return { ok: false };
    clean.title = t.slice(0, 120);
  }
  if (patch.notes !== undefined) clean.notes = patch.notes?.trim() || null;
  if (patch.dueDate !== undefined)
    clean.dueDate =
      patch.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(patch.dueDate)
        ? patch.dueDate
        : null;
  const ok = await updateTask(taskId, clean);
  if (ok) revalidatePath("/dashboard");
  return { ok };
}

export async function toggleTaskAction(
  taskId: string,
  completed: boolean,
): Promise<{ ok: boolean }> {
  const ok = await updateTask(taskId, {
    completed,
    completedAt: completed ? new Date() : null,
  });
  if (ok) revalidatePath("/dashboard");
  return { ok };
}

export async function deleteTaskAction(
  taskId: string,
): Promise<{ ok: boolean }> {
  const ok = await deleteTask(taskId);
  if (ok) revalidatePath("/dashboard");
  return { ok };
}

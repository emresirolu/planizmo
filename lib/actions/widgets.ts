"use server";

import { revalidatePath } from "next/cache";
import {
  addWidget,
  getLog,
  getMyTimezone,
  getMyWidget,
  removeWidget,
  toClientWidget,
  upsertLog,
} from "@/lib/db/scoped";
import { getPreset } from "@/lib/widgets/catalog";
import { todayInTimeZone } from "@/lib/widgets/date";
import { nextLogState } from "@/lib/widgets/logic";
import type {
  ClientWidget,
  LogOp,
  LogState,
  Schedule,
} from "@/lib/widgets/types";

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

type LogResult =
  | { ok: true; state: LogState }
  | { ok: false; error: string };

export async function logWidget(
  widgetId: string,
  op: LogOp,
): Promise<LogResult> {
  try {
    const widget = await getMyWidget(widgetId);
    if (!widget) return { ok: false, error: "Widget not found" };

    const tz = await getMyTimezone();
    const date = todayInTimeZone(tz);

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
    return {
      ok: true,
      state: {
        value: row.value != null ? Number(row.value) : null,
        completed: row.completed,
      },
    };
  } catch {
    return { ok: false, error: "Couldn’t save — try again" };
  }
}

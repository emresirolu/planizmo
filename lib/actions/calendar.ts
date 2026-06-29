"use server";

import { revalidatePath } from "next/cache";
import {
  addCalendarEvent,
  deleteCalendarEvent,
  getMyTimezone,
  getMyWidget,
  updateCalendarEvent,
  upsertLog,
} from "@/lib/db/scoped";
import { todayInTimeZone } from "@/lib/widgets/date";
import { recomputeMyStreak } from "@/lib/widgets/streak-service";
import { isStreakType } from "@/lib/widgets/types";
import type { CalEventType, ClientEvent } from "@/lib/calendar/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const TYPES: CalEventType[] = ["block", "event", "task", "habit"];

function cleanTime(t?: string | null): string | null {
  if (!t) return null;
  return TIME_RE.test(t) ? t : null;
}

async function resolveDate(input?: string | null): Promise<string> {
  if (input && DATE_RE.test(input)) return input;
  return todayInTimeZone(await getMyTimezone());
}

function toClient(e: { id: string; title: string; date: string; startTime: string | null; endTime: string | null; type: CalEventType; source: "manual" | "ai"; completed: boolean; linkedWidgetId: string | null }): ClientEvent {
  return {
    id: e.id,
    title: e.title,
    date: e.date,
    startTime: e.startTime ? e.startTime.slice(0, 5) : null,
    endTime: e.endTime ? e.endTime.slice(0, 5) : null,
    type: e.type,
    source: e.source,
    completed: e.completed,
    linkedWidgetId: e.linkedWidgetId,
  };
}

export async function addEventAction(input: {
  title: string;
  date?: string;
  startTime?: string | null;
  endTime?: string | null;
  type?: CalEventType;
}): Promise<{ ok: true; event: ClientEvent } | { ok: false; error: string }> {
  const title = (input.title || "").trim();
  if (!title) return { ok: false, error: "Give it a title." };
  const type = input.type && TYPES.includes(input.type) ? input.type : "event";
  try {
    const row = await addCalendarEvent({
      title: title.slice(0, 120),
      date: await resolveDate(input.date),
      startTime: cleanTime(input.startTime),
      endTime: cleanTime(input.endTime),
      type,
      source: "manual",
    });
    revalidatePath("/dashboard/calendar");
    return { ok: true, event: toClient(row) };
  } catch {
    return { ok: false, error: "Couldn't save — try again." };
  }
}

export async function updateEventAction(
  id: string,
  patch: { title?: string; date?: string; startTime?: string | null; endTime?: string | null; type?: CalEventType },
): Promise<{ ok: boolean; error?: string }> {
  const clean: Record<string, unknown> = {};
  if (patch.title !== undefined) { const t = patch.title.trim(); if (!t) return { ok: false, error: "Title can't be empty." }; clean.title = t.slice(0, 120); }
  if (patch.date !== undefined && DATE_RE.test(patch.date)) clean.date = patch.date;
  if (patch.startTime !== undefined) clean.startTime = cleanTime(patch.startTime);
  if (patch.endTime !== undefined) clean.endTime = cleanTime(patch.endTime);
  if (patch.type !== undefined && TYPES.includes(patch.type)) clean.type = patch.type;
  const row = await updateCalendarEvent(id, clean);
  if (row) revalidatePath("/dashboard/calendar");
  return { ok: Boolean(row) };
}

export async function toggleEventCompleteAction(id: string, completed: boolean): Promise<{ ok: boolean }> {
  const row = await updateCalendarEvent(id, { completed });
  if (row) revalidatePath("/dashboard/calendar");
  return { ok: Boolean(row) };
}

export async function deleteEventAction(id: string): Promise<{ ok: boolean }> {
  const ok = await deleteCalendarEvent(id);
  if (ok) revalidatePath("/dashboard/calendar");
  return { ok };
}

/** Mark a recurring habit done/undone for a specific day from the calendar. */
export async function setHabitDoneAction(
  widgetId: string,
  date: string,
  completed: boolean,
): Promise<{ ok: boolean }> {
  const w = await getMyWidget(widgetId);
  if (!w) return { ok: false };
  const day = DATE_RE.test(date) ? date : await resolveDate(null);
  await upsertLog(widgetId, day, { value: null, completed });
  if (isStreakType(w.type)) await recomputeMyStreak(widgetId, day);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard");
  return { ok: true };
}

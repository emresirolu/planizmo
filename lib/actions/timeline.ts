"use server";

import { revalidatePath } from "next/cache";
import {
  addTimeBlock,
  getMyPlan,
  getMyTimezone,
  removeTimeBlock,
  setMyViewMode,
  updateTimeBlock,
  type ViewMode,
} from "@/lib/db/scoped";
import { can, UPGRADE_COPY } from "@/lib/billing/plan";
import { isCategory, type Category } from "@/lib/plan/categories";
import { isValidHHMM, type ClientTimeBlock } from "@/lib/plan/timeline";
import { todayInTimeZone } from "@/lib/widgets/date";

export async function setViewModeAction(
  mode: ViewMode,
): Promise<{ ok: boolean; error?: string; upgrade?: boolean }> {
  if (mode !== "flow" && mode !== "timeline") return { ok: false };
  if (mode === "timeline" && !can(await getMyPlan(), "timeline_mode")) {
    return { ok: false, upgrade: true, error: UPGRADE_COPY.timeline_mode };
  }
  try {
    await setMyViewMode(mode);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

function clientBlock(row: {
  id: string;
  startTime: string;
  durationMin: number;
  title: string;
  category: string;
  completed: boolean;
}): ClientTimeBlock {
  return {
    id: row.id,
    startTime: row.startTime.slice(0, 5),
    durationMin: row.durationMin,
    title: row.title,
    category: (isCategory(row.category) ? row.category : "focus") as Category,
    completed: row.completed,
  };
}

export async function addTimeBlockAction(input: {
  startTime: string;
  durationMin: number;
  title: string;
  category: string;
}): Promise<{ ok: true; block: ClientTimeBlock } | { ok: false; error: string }> {
  if (!can(await getMyPlan(), "timeline_mode")) return { ok: false, error: UPGRADE_COPY.timeline_mode };
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Enter a title" };
  if (!isValidHHMM(input.startTime)) return { ok: false, error: "Invalid time" };
  const dur = Number.isFinite(input.durationMin) ? Math.max(5, Math.min(600, Math.round(input.durationMin))) : 30;
  const category = isCategory(input.category) ? input.category : "focus";
  try {
    const date = todayInTimeZone(await getMyTimezone());
    const row = await addTimeBlock({ date, startTime: input.startTime, durationMin: dur, title: title.slice(0, 120), category });
    revalidatePath("/dashboard");
    return { ok: true, block: clientBlock(row) };
  } catch {
    return { ok: false, error: "Could not add block" };
  }
}

export async function updateTimeBlockAction(
  id: string,
  patch: { title?: string; startTime?: string; durationMin?: number; category?: string },
): Promise<{ ok: boolean }> {
  const clean: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (!t) return { ok: false };
    clean.title = t.slice(0, 120);
  }
  if (patch.startTime !== undefined) {
    if (!isValidHHMM(patch.startTime)) return { ok: false };
    clean.startTime = patch.startTime;
  }
  if (patch.durationMin !== undefined) clean.durationMin = Math.max(5, Math.min(600, Math.round(patch.durationMin)));
  if (patch.category !== undefined && isCategory(patch.category)) clean.category = patch.category;
  const ok = await updateTimeBlock(id, clean);
  if (ok) revalidatePath("/dashboard");
  return { ok };
}

export async function toggleTimeBlockAction(id: string, completed: boolean): Promise<{ ok: boolean }> {
  const ok = await updateTimeBlock(id, { completed });
  if (ok) revalidatePath("/dashboard");
  return { ok };
}

export async function removeTimeBlockAction(id: string): Promise<{ ok: boolean }> {
  const ok = await removeTimeBlock(id);
  if (ok) revalidatePath("/dashboard");
  return { ok };
}

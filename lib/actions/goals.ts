"use server";

import { revalidatePath } from "next/cache";
import {
  addGoal,
  deleteGoal,
  setGoalPositions,
  toClientGoal,
  updateGoal,
} from "@/lib/db/scoped";
import { GOAL_ICONS, type ClientGoal, type GoalStatus } from "@/lib/goals/types";

const STATUSES: GoalStatus[] = ["active", "done", "paused"];

function clampPct(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
function cleanDate(v: unknown): string | null {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

function revalidate() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/goals");
}

export async function addGoalAction(input: {
  title: string;
  icon?: string;
  description?: string;
  nextStep?: string;
  progressPct?: number;
  targetDate?: string | null;
}): Promise<{ ok: true; goal: ClientGoal } | { ok: false; error: string }> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Give it a title" };
  try {
    const g = await addGoal({
      title: title.slice(0, 100),
      icon: GOAL_ICONS.includes(input.icon ?? "") ? input.icon : "goal",
      description: input.description?.trim().slice(0, 500) || null,
      nextStep: input.nextStep?.trim().slice(0, 200) || null,
      progressPct: clampPct(input.progressPct ?? 0),
      targetDate: cleanDate(input.targetDate),
    });
    revalidate();
    return { ok: true, goal: toClientGoal(g) };
  } catch {
    return { ok: false, error: "Could not add goal" };
  }
}

export async function updateGoalAction(
  goalId: string,
  patch: {
    title?: string;
    icon?: string;
    description?: string | null;
    nextStep?: string | null;
    progressPct?: number;
    targetDate?: string | null;
  },
): Promise<{ ok: boolean }> {
  const clean: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (!t) return { ok: false };
    clean.title = t.slice(0, 100);
  }
  if (patch.icon !== undefined && GOAL_ICONS.includes(patch.icon)) clean.icon = patch.icon;
  if (patch.description !== undefined) clean.description = patch.description?.trim().slice(0, 500) || null;
  if (patch.nextStep !== undefined) clean.nextStep = patch.nextStep?.trim().slice(0, 200) || null;
  if (patch.progressPct !== undefined) clean.progressPct = clampPct(patch.progressPct);
  if (patch.targetDate !== undefined) clean.targetDate = cleanDate(patch.targetDate);
  const row = await updateGoal(goalId, clean);
  if (row) revalidate();
  return { ok: Boolean(row) };
}

export async function setGoalStatusAction(
  goalId: string,
  status: GoalStatus,
): Promise<{ ok: boolean }> {
  if (!STATUSES.includes(status)) return { ok: false };
  // completing a goal also takes it to 100%
  const patch = status === "done" ? { status, progressPct: 100 } : { status };
  const row = await updateGoal(goalId, patch);
  if (row) revalidate();
  return { ok: Boolean(row) };
}

export async function deleteGoalAction(goalId: string): Promise<{ ok: boolean }> {
  const ok = await deleteGoal(goalId);
  if (ok) revalidate();
  return { ok };
}

export async function reorderGoalsAction(orderedIds: string[]): Promise<{ ok: boolean }> {
  try {
    await setGoalPositions(orderedIds);
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

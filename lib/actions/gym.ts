"use server";

import { revalidatePath } from "next/cache";
import {
  addWorkout,
  addWorkoutSet,
  deleteWorkout,
  getMyTimezone,
  upsertBodyMetric,
} from "@/lib/db/scoped";
import { todayInTimeZone } from "@/lib/widgets/date";
import type { ClientWorkout } from "@/lib/gym/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function resolveDate(input?: string | null): Promise<string> {
  if (input && DATE_RE.test(input)) return input;
  return todayInTimeZone(await getMyTimezone());
}

/** Invalidate every surface that reads workout data so a log made on one device
 *  (e.g. mobile) is reflected everywhere it's shown, not just the Gym tab. */
function revalidateWorkoutSurfaces(): void {
  revalidatePath("/dashboard/gym");
  revalidatePath("/dashboard/review");
  revalidatePath("/dashboard/health");
  revalidatePath("/dashboard");
}

/** Coerce a free-text numeric field; empty -> null, invalid -> null. */
function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function logBodyMetricAction(input: {
  date?: string;
  weight?: number | string | null;
  bodyFatPct?: number | string | null;
  muscleMass?: number | string | null;
  notes?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const weight = num(input.weight);
  const bodyFatPct = num(input.bodyFatPct);
  const muscleMass = num(input.muscleMass);
  if (weight == null && bodyFatPct == null && muscleMass == null) {
    return { ok: false, error: "Enter at least one measurement." };
  }
  try {
    const date = await resolveDate(input.date);
    // Only write the fields the user actually entered (don't wipe the others).
    const patch: Record<string, number | string | null> = {};
    if (input.weight !== undefined && input.weight !== "") patch.weight = weight;
    if (input.bodyFatPct !== undefined && input.bodyFatPct !== "") patch.bodyFatPct = bodyFatPct;
    if (input.muscleMass !== undefined && input.muscleMass !== "") patch.muscleMass = muscleMass;
    if (input.notes != null) patch.notes = input.notes.trim() || null;
    await upsertBodyMetric(date, patch);
    revalidatePath("/dashboard/gym");
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't save — try again." };
  }
}

export async function addWorkoutAction(input: {
  date?: string;
  name: string;
  durationMin?: number | string | null;
  notes?: string | null;
  sets?: Array<{ exercise: string; sets?: number | string | null; reps?: number | string | null; weight?: number | string | null }>;
}): Promise<{ ok: true; workout: ClientWorkout } | { ok: false; error: string }> {
  const name = (input.name || "").trim();
  if (!name) return { ok: false, error: "Give the workout a name." };
  try {
    const date = await resolveDate(input.date);
    const w = await addWorkout({
      date,
      name: name.slice(0, 80),
      durationMin: num(input.durationMin),
      notes: input.notes?.trim() || null,
    });

    const cleanSets = (input.sets ?? [])
      .map((s) => ({ ...s, exercise: (s.exercise || "").trim() }))
      .filter((s) => s.exercise.length > 0);

    const savedSets: ClientWorkout["sets"] = [];
    for (let i = 0; i < cleanSets.length; i++) {
      const s = cleanSets[i];
      const row = await addWorkoutSet({
        workoutId: w.id,
        exercise: s.exercise.slice(0, 60),
        sets: num(s.sets),
        reps: num(s.reps),
        weight: num(s.weight),
        position: i,
      });
      if (row) {
        savedSets.push({
          id: row.id,
          exercise: row.exercise,
          sets: row.sets,
          reps: row.reps,
          weight: row.weight == null ? null : Number(row.weight),
        });
      }
    }

    revalidateWorkoutSurfaces();
    return {
      ok: true,
      workout: {
        id: w.id,
        date: w.date,
        name: w.name,
        durationMin: w.durationMin,
        notes: w.notes,
        sets: savedSets,
      },
    };
  } catch {
    return { ok: false, error: "Couldn't save the workout — try again." };
  }
}

export async function deleteWorkoutAction(workoutId: string): Promise<{ ok: boolean }> {
  try {
    const ok = await deleteWorkout(workoutId);
    if (ok) revalidateWorkoutSurfaces();
    return { ok };
  } catch {
    return { ok: false };
  }
}

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import GymTab from "@/components/GymTab";
import {
  getBodyMetricsSince,
  getMyProfile,
  getSetsForWorkoutIds,
  listRecentWorkouts,
} from "@/lib/db/scoped";
import { todayInTimeZone } from "@/lib/widgets/date";
import { addDays } from "@/lib/widgets/streak";
import type { ClientBodyMetric, ClientWorkout } from "@/lib/gym/types";

export default async function GymPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const profile = await getMyProfile();
  const tz = profile?.timezone || "UTC";
  const today = todayInTimeZone(tz);
  const since = addDays(today, -365);

  const [metricRows, workoutRows] = await Promise.all([
    getBodyMetricsSince(since),
    listRecentWorkouts(30),
  ]);
  const sets = await getSetsForWorkoutIds(workoutRows.map((w) => w.id));

  const bodyMetrics: ClientBodyMetric[] = metricRows.map((m) => ({
    date: m.date,
    weight: m.weight == null ? null : Number(m.weight),
    bodyFatPct: m.bodyFatPct == null ? null : Number(m.bodyFatPct),
    muscleMass: m.muscleMass == null ? null : Number(m.muscleMass),
    notes: m.notes,
  }));

  const workouts: ClientWorkout[] = workoutRows.map((w) => ({
    id: w.id,
    date: w.date,
    name: w.name,
    durationMin: w.durationMin,
    notes: w.notes,
    sets: sets
      .filter((s) => s.workoutId === w.id)
      .map((s) => ({
        id: s.id,
        exercise: s.exercise,
        sets: s.sets,
        reps: s.reps,
        weight: s.weight == null ? null : Number(s.weight),
      })),
  }));

  return <GymTab bodyMetrics={bodyMetrics} workouts={workouts} today={today} weightUnit="kg" />;
}

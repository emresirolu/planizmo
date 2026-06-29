/** Client-facing gym shapes (numbers, not numeric strings / Date objects). */

export type ClientBodyMetric = {
  date: string; // YYYY-MM-DD
  weight: number | null;
  bodyFatPct: number | null;
  muscleMass: number | null;
  notes: string | null;
};

export type ClientWorkoutSet = {
  id: string;
  exercise: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
};

export type ClientWorkout = {
  id: string;
  date: string;
  name: string;
  durationMin: number | null;
  notes: string | null;
  sets: ClientWorkoutSet[];
};

/** Which direction counts as "improving" for a body metric. */
export type Direction = "up" | "down" | "neutral";

export const BODY_METRICS: {
  key: "weight" | "bodyFatPct" | "muscleMass";
  label: string;
  unit: string;
  direction: Direction; // weight is neutral until a goal weight exists (Phase 6)
}[] = [
  { key: "weight", label: "Weight", unit: "kg", direction: "neutral" },
  { key: "bodyFatPct", label: "Body fat", unit: "%", direction: "down" },
  { key: "muscleMass", label: "Muscle", unit: "kg", direction: "up" },
];

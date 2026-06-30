/**
 * Deterministic daybook generation from onboarding answers.
 *
 * This is the mock generator: a pure function that maps answers -> a structured
 * plan. When AI generation is wired, replace `planFromAnswers` with a call that
 * returns the same `DaybookPlan` shape; the apply step (lib/actions/onboarding)
 * stays unchanged.
 */

export const LIFE_AREAS = ["School", "Fitness", "Work", "Startup", "Reading", "Music", "Content", "Mental clarity", "Custom"] as const;
export const ENERGY_OPTS = ["Morning", "Afternoon", "Night", "Depends"] as const;
export const COACH_OPTS: [string, string][] = [
  ["Gentle", "Encouraging, low-pressure"],
  ["Direct", "Clear and to the point"],
  ["Strict", "Holds you accountable"],
  ["Reflective", "Asks before it answers"],
];

export type OnboardingAnswers = {
  areas: string[];
  goals: string[];
  routine: string;
  energy: string;
  coaching: string;
};

export type TrackerSpec = {
  type: "counter" | "habit" | "reading" | "mood" | "health";
  title: string;
  icon: string;
  unit: string | null;
  target: number | null;
  schedule: "daily" | "weekdays" | "times_per_week";
};
export type BlockSpec = { title: string; startTime: string; type: "block" | "habit" | "task" };
export type DaybookPlan = { goals: string[]; trackers: TrackerSpec[]; blocks: BlockSpec[]; metrics: string[] };

const TRACKMAP: Record<string, string[]> = {
  Fitness: ["Sleep", "Protein", "Workouts"],
  Startup: ["Deep work", "Focus"],
  Work: ["Deep work"],
  School: ["Study hours"],
  Reading: ["Reading streak"],
  Music: ["Practice time"],
  Content: ["Output"],
  "Mental clarity": ["Mood", "Energy"],
};

const TRACKER_SPECS: Record<string, TrackerSpec> = {
  Sleep: { type: "counter", title: "Sleep", icon: "counter", unit: "hours", target: 8, schedule: "daily" },
  Protein: { type: "counter", title: "Protein", icon: "counter", unit: "g", target: 150, schedule: "daily" },
  Workouts: { type: "habit", title: "Workouts", icon: "gym", unit: null, target: 4, schedule: "times_per_week" },
  "Deep work": { type: "counter", title: "Deep work", icon: "counter", unit: "hrs", target: 4, schedule: "weekdays" },
  Focus: { type: "counter", title: "Focus", icon: "counter", unit: "sessions", target: 2, schedule: "daily" },
  "Study hours": { type: "counter", title: "Study hours", icon: "book", unit: "hrs", target: 3, schedule: "daily" },
  "Reading streak": { type: "reading", title: "Reading", icon: "book", unit: "min", target: 20, schedule: "daily" },
  "Practice time": { type: "counter", title: "Practice", icon: "counter", unit: "min", target: 30, schedule: "daily" },
  Output: { type: "counter", title: "Output", icon: "counter", unit: null, target: 1, schedule: "daily" },
  Mood: { type: "mood", title: "Mood", icon: "mood", unit: null, target: null, schedule: "daily" },
  Energy: { type: "mood", title: "Energy", icon: "mood", unit: null, target: null, schedule: "daily" },
};

export function planFromAnswers(a: OnboardingAnswers): DaybookPlan {
  const goals = a.goals.map((g) => g.trim()).filter(Boolean).slice(0, 3);

  const names: string[] = [];
  for (const area of a.areas) for (const t of TRACKMAP[area] ?? []) if (!names.includes(t)) names.push(t);
  if (names.length === 0) names.push("Sleep", "Focus");
  const trackers = names.slice(0, 6).map((n) => TRACKER_SPECS[n]).filter(Boolean);

  const top = goals[0] || "your top mission";
  const blocks: BlockSpec[] = [
    { title: "Deep work · session 1", startTime: "09:00", type: "block" },
    { title: `Goal block · ${top}`, startTime: "13:00", type: "block" },
  ];
  if (a.areas.includes("Fitness")) blocks.push({ title: "Gym · upper body", startTime: "18:00", type: "habit" });
  if (a.areas.includes("Reading")) blocks.push({ title: "Read · 20 min", startTime: "21:00", type: "habit" });

  const metrics = ["Consistency", "Deep work hrs", a.areas.includes("Fitness") ? "Workouts" : "Goal progress"];

  return { goals, trackers, blocks, metrics };
}

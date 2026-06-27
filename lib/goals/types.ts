export type GoalStatus = "active" | "done" | "paused";

export type ClientGoal = {
  id: string;
  title: string;
  icon: string;
  description: string | null;
  progressPct: number;
  nextStep: string | null;
  status: GoalStatus;
  targetDate: string | null; // YYYY-MM-DD
  position: number;
};

export const GOAL_ICONS = ["goal", "rocket", "gym", "bank", "reading", "health"];

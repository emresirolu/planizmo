import type { Schedule, WidgetSize, WidgetType } from "./types";

export type Preset = {
  key: string;
  title: string;
  /** Icon key resolved by <WidgetIcon />. */
  icon: string;
  type: WidgetType;
  schedule: Schedule;
  target: number | null;
  unit: string | null;
  size: WidgetSize;
  blurb: string;
  /** True for the "build your own" entry that opens a form instead of adding. */
  custom?: boolean;
};

export const PRESETS: Preset[] = [
  {
    key: "water",
    title: "Water",
    icon: "water",
    type: "counter",
    schedule: "daily",
    target: 8,
    unit: "glasses",
    size: "1x1",
    blurb: "8 glasses a day",
  },
  {
    key: "gym",
    title: "Gym",
    icon: "gym",
    type: "habit",
    schedule: "times_per_week",
    target: 4,
    unit: null,
    size: "1x1",
    blurb: "4× a week",
  },
  {
    key: "sleep",
    title: "Sleep",
    icon: "sleep",
    type: "health",
    schedule: "daily",
    target: 8,
    unit: "hours",
    size: "2x1",
    blurb: "8 hours a night",
  },
  {
    key: "steps",
    title: "Steps",
    icon: "steps",
    type: "health",
    schedule: "daily",
    target: 8000,
    unit: "steps",
    size: "2x1",
    blurb: "8,000 steps a day",
  },
  {
    key: "mood",
    title: "Mood",
    icon: "mood",
    type: "mood",
    schedule: "daily",
    target: null,
    unit: null,
    size: "1x1",
    blurb: "How are you today?",
  },
  {
    key: "reading",
    title: "Reading",
    icon: "reading",
    type: "reading",
    schedule: "daily",
    target: 20,
    unit: "pages",
    size: "1x1",
    blurb: "20 pages a day",
  },
  {
    key: "checklist",
    title: "Daily checklist",
    icon: "checklist",
    type: "checklist",
    schedule: "daily",
    target: null,
    unit: null,
    size: "2x2",
    blurb: "A routine that resets each day",
  },
  {
    key: "tasks",
    title: "Tasks",
    icon: "tasks",
    type: "tasks",
    schedule: "daily",
    target: null,
    unit: null,
    size: "2x2",
    blurb: "One-off to-dos with due dates",
  },
  {
    key: "custom",
    title: "Custom tracker",
    icon: "counter",
    type: "counter",
    schedule: "daily",
    target: 1,
    unit: null,
    size: "1x1",
    blurb: "Track a habit or a number, your way",
    custom: true,
  },
];

export function getPreset(key: string): Preset | undefined {
  return PRESETS.find((p) => p.key === key);
}

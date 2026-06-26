import type { HeatCell, Schedule } from "./types";

/* ---------------------------------------------------------------------------
 * Pure date helpers. All dates are "YYYY-MM-DD" strings already resolved to
 * the user's timezone upstream; arithmetic is done in UTC to avoid drift.
 * ------------------------------------------------------------------------- */

function toUTC(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function addDays(date: string, n: number): string {
  const d = toUTC(date);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}
/** 0 = Sunday … 6 = Saturday */
function dow(date: string): number {
  return toUTC(date).getUTCDay();
}
/** Monday (ISO week start) for the week containing `date`. */
export function mondayOf(date: string): string {
  const offset = (dow(date) + 6) % 7; // days since Monday
  return addDays(date, -offset);
}

function scheduledOnDay(schedule: Schedule, date: string): boolean {
  if (schedule === "weekdays") {
    const d = dow(date);
    return d >= 1 && d <= 5;
  }
  return true; // daily (times_per_week is evaluated per week, not per day)
}

/* ---------------------------------------------------------------------------
 * Streak + strength engine.
 * ------------------------------------------------------------------------- */

type Unit = { key: string; met: boolean; pending: boolean };

const WINDOW_DAYS = 120; // history scanned for streak/longest
const STRENGTH_UNITS = 30; // EW window
const DECAY = 0.94; // recent units weighted heavier
const GRACE_WINDOW = 7; // at most one auto-grace per 7 scheduled units

export type StreakInput = {
  schedule: Schedule;
  target: number | null;
  /** Day-level completions (set of YYYY-MM-DD). */
  completedDates: Set<string>;
  /** Evaluate as-of this date (the user's "today"). */
  asOf: string;
  /** Preserve the high-water mark across recomputes. */
  storedLongest?: number;
};

export type StreakResult = {
  currentStreak: number;
  longestStreak: number;
  strength: number;
  lastCompletedDate: string | null;
};

/** Build the ordered (oldest → newest) list of scheduled units with met flags. */
function buildUnits(input: StreakInput): Unit[] {
  const { schedule, target, completedDates, asOf } = input;

  // Anchor the window at the first-ever completion so days before the widget
  // existed aren't counted as misses (a new, perfectly-kept widget reads 100%).
  let earliest: string | null = null;
  for (const d of completedDates) {
    if (d <= asOf && (earliest === null || d < earliest)) earliest = d;
  }
  if (earliest === null) return []; // no history yet
  const windowStart = addDays(asOf, -WINDOW_DAYS);
  const start = earliest > windowStart ? earliest : windowStart;

  if (schedule === "times_per_week") {
    const weeklyTarget = target ?? 1;
    const units: Unit[] = [];
    let week = mondayOf(start);
    const lastWeek = mondayOf(asOf);
    while (week <= lastWeek) {
      let count = 0;
      for (let i = 0; i < 7; i++) {
        if (completedDates.has(addDays(week, i))) count++;
      }
      const met = count >= weeklyTarget;
      const pending = week === lastWeek && !met; // in-progress week, not yet met
      units.push({ key: week, met, pending });
      week = addDays(week, 7);
    }
    return units;
  }

  const units: Unit[] = [];
  let day = start;
  while (day <= asOf) {
    if (scheduledOnDay(schedule, day)) {
      const met = completedDates.has(day);
      // Today, not yet logged, is in-progress — not a miss until the day ends.
      units.push({ key: day, met, pending: day === asOf && !met });
    }
    day = addDays(day, 1);
  }
  return units;
}

export function computeStreak(input: StreakInput): StreakResult {
  const units = buildUnits(input);
  const finalized = units.filter((u) => !u.pending);

  // ---- current streak (walk backward from newest finalized unit) ----
  // Skip a leading pending unit (in-progress week not yet met) — it neither
  // extends nor breaks the streak.
  let i = units.length - 1;
  while (i >= 0 && units[i].pending) i--;

  let current = 0;
  let lastGracePos = Number.POSITIVE_INFINITY;
  while (i >= 0) {
    const u = units[i];
    if (u.met) {
      current++;
      i--;
      continue;
    }
    // a miss
    const prevAlsoMiss = i - 1 >= 0 && !units[i - 1].met && !units[i - 1].pending;
    if (prevAlsoMiss) break; // two consecutive misses → streak ends
    // single miss: absorb with auto-grace if none used in the rolling window
    if (lastGracePos - i >= GRACE_WINDOW) {
      lastGracePos = i;
      i--; // bridge the gap; graced day does not add to the count
      continue;
    }
    break;
  }

  // ---- strength: exponentially-weighted completion over recent units ----
  const recent = finalized.slice(-STRENGTH_UNITS).reverse(); // newest first
  let num = 0;
  let den = 0;
  recent.forEach((u, k) => {
    const w = Math.pow(DECAY, k);
    den += w;
    if (u.met) num += w;
  });
  const strength = den > 0 ? Math.round((100 * num) / den) : 0;

  // ---- longest: preserved high-water mark ----
  const longestStreak = Math.max(input.storedLongest ?? 0, current);

  // ---- last completed day ----
  let lastCompletedDate: string | null = null;
  for (const d of input.completedDates) {
    if (d <= input.asOf && (lastCompletedDate === null || d > lastCompletedDate)) {
      lastCompletedDate = d;
    }
  }

  return { currentStreak: current, longestStreak, strength, lastCompletedDate };
}

/* ---------------------------------------------------------------------------
 * Heatmap (~12 weeks) — accent for met days, faint for scheduled-but-not,
 * blank for non-scheduled days. Non-shaming by design.
 * ------------------------------------------------------------------------- */

export function buildHeatmap(
  completedDates: Set<string>,
  schedule: Schedule,
  asOf: string,
  weeks = 12,
): HeatCell[] {
  const days = weeks * 7;
  const cells: HeatCell[] = [];
  for (let k = days - 1; k >= 0; k--) {
    const date = addDays(asOf, -k);
    let level: HeatCell["level"];
    if (completedDates.has(date)) level = 4;
    else if (schedule !== "times_per_week" && scheduledOnDay(schedule, date))
      level = 1;
    else if (schedule === "times_per_week") level = 1;
    else level = 0;
    cells.push({ date, level });
  }
  return cells;
}

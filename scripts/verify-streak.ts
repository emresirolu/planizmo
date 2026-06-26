/**
 * Runnable verification of the streak/strength engine.
 *
 * Pure & in-memory — it imports the real engine (lib/widgets/streak.ts) and
 * runs fake widgets through it. It never opens a DB connection, so it cannot
 * read or mutate any real widgets/logs.
 *
 *   node scripts/verify-streak.ts
 */
import { addDays, computeStreak, mondayOf } from "../lib/widgets/streak.ts";

const asOf = "2026-06-26"; // evaluation day; the day itself is left unlogged (in-progress)

let allOk = true;
function row(label: string, r: { currentStreak: number; longestStreak: number; strength: number }) {
  console.log(
    `${label}\n    current_streak=${r.currentStreak}  longest_streak=${r.longestStreak}  strength=${r.strength}`,
  );
}
function expect(cond: boolean, msg: string) {
  if (!cond) {
    allOk = false;
    console.log(`    ❌ MISMATCH: ${msg}`);
  } else {
    console.log(`    ✓ ${msg}`);
  }
}

// Build a daily completion set: finalized day -1 = yesterday, ... ; `asOf` itself
// is left unlogged (pending). `metOffsets` lists which day-offsets are met.
function dailySet(metOffsets: number[]): Set<string> {
  return new Set(metOffsets.map((k) => addDays(asOf, -k)));
}

console.log("================ STREAK ENGINE VERIFICATION ================");
console.log(`evaluation day (asOf): ${asOf} — today is left unlogged (in-progress)\n`);

/* 1) 10 scheduled days all met (days -1..-10) */
const s1 = computeStreak({
  schedule: "daily",
  target: null,
  completedDates: dailySet([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
  asOf,
});
console.log("Scenario 1 — 10 scheduled days, all met:");
row("  result", s1);
expect(s1.currentStreak === 10, "current=10");
expect(s1.longestStreak === 10, "longest=10");
expect(s1.strength >= 90, "strength is high (>=90)");
console.log();

/* 2) then miss ONE scheduled day (the most recent finalized day, -1) */
const s2 = computeStreak({
  schedule: "daily",
  target: null,
  completedDates: dailySet([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), // -1 missed, 10 met behind it
  asOf,
  storedLongest: s1.longestStreak, // carry the high-water mark forward
});
console.log("Scenario 2 — then miss ONE scheduled day (auto-grace):");
row("  result", s2);
expect(s2.currentStreak === 10, "current unchanged at 10 (single miss absorbed)");
expect(s2.longestStreak === 10, "longest still 10");
expect(s2.strength < s1.strength && s2.strength > 0, `strength dips a few points (${s1.strength} → ${s2.strength}), not zeroed`);
console.log();

/* 3) then miss a SECOND consecutive scheduled day (-1 and -2 both missed) */
const s3 = computeStreak({
  schedule: "daily",
  target: null,
  completedDates: dailySet([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), // -1 & -2 missed
  asOf,
  storedLongest: s2.longestStreak,
});
console.log("Scenario 3 — then miss a SECOND consecutive day (reset):");
row("  result", s3);
expect(s3.currentStreak === 0, "current reset to 0");
expect(s3.longestStreak === 10, "longest still 10 (preserved)");
expect(s3.strength > 0, `strength preserved, not zeroed (${s3.strength})`);
console.log();

/* 4) times_per_week habit hitting its weekly target (3x/week) */
const curMon = mondayOf(asOf);
const weekly = new Set<string>();
for (let w = 1; w <= 3; w++) {
  const ws = addDays(curMon, -7 * w);
  weekly.add(ws);
  weekly.add(addDays(ws, 1));
  weekly.add(addDays(ws, 2)); // exactly 3 logged days that week (4 days left blank)
}
const s4 = computeStreak({ schedule: "times_per_week", target: 3, completedDates: weekly, asOf });
console.log("Scenario 4 — times_per_week (3×/week), 3 met weeks, 4 blank days/week:");
row("  result (streak counts WEEKS)", s4);
expect(s4.currentStreak === 3, "current=3 weeks met");
expect(s4.strength === 100, "strength=100 — blank days are NOT counted as daily misses");
console.log();

/* 5) nightly rollover run twice over the same day → idempotent */
console.log("Scenario 5 — nightly rollover run twice (idempotency):");
const logs = dailySet([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]); // same fake state as scenario 2
type Row = { currentStreak: number; longestStreak: number; strength: number };
let persisted: Row | null = null;
function rollover(): Row {
  // mirrors recomputeStreakForUser: read stored longest, compute, persist.
  const res = computeStreak({
    schedule: "daily",
    target: null,
    completedDates: logs,
    asOf,
    storedLongest: persisted?.longestStreak ?? 0,
  });
  persisted = { currentStreak: res.currentStreak, longestStreak: res.longestStreak, strength: res.strength };
  return persisted;
}
const run1 = rollover();
const run2 = rollover();
row("  run 1", run1);
row("  run 2", run2);
expect(
  run1.currentStreak === run2.currentStreak &&
    run1.longestStreak === run2.longestStreak &&
    run1.strength === run2.strength,
  "second run identical to first (idempotent)",
);
console.log();

console.log("============================================================");
console.log(allOk ? "ALL SCENARIOS MATCHED EXPECTATIONS ✓" : "SOME SCENARIOS DID NOT MATCH — see ❌ above");
process.exit(allOk ? 0 : 1);

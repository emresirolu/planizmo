import { addDays } from "@/lib/widgets/streak";
import type { DailyHealth, HealthProvider } from "./types";

/**
 * Deterministic mock health data — stable per (user, date) so values don't
 * change on reload. Seeded by a hash of userId + date so the same day always
 * yields the same sleep/steps.
 */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rand01(userId: string, date: string, salt: string): number {
  return hash(`${userId}|${date}|${salt}`) / 4294967296;
}

export function mockDaily(userId: string, date: string): {
  sleepHours: number;
  steps: number;
} {
  const sleepHours = Math.round((6 + rand01(userId, date, "sleep") * 2.5) * 10) / 10; // 6.0–8.5
  const steps = Math.round((5000 + rand01(userId, date, "steps") * 7000) / 10) * 10; // 5,000–12,000
  return { sleepHours, steps };
}

export const mockProvider: HealthProvider = {
  name: "mock",
  async fetchRange(userId, fromDate, toDate): Promise<DailyHealth[]> {
    const out: DailyHealth[] = [];
    let d = fromDate;
    while (d <= toDate) {
      const { sleepHours, steps } = mockDaily(userId, d);
      out.push({ date: d, sleepHours, steps });
      d = addDays(d, 1);
    }
    return out;
  },
};

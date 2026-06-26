import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { profiles, streaks, widgets } from "./schema";
import { recomputeStreakForUser } from "@/lib/widgets/streak-service";
import { todayInTimeZone } from "@/lib/widgets/date";
import { isStreakType } from "@/lib/widgets/types";

/**
 * SYSTEM context — used ONLY by the protected nightly cron route. It operates
 * across all users (no session), so every query is filtered by an explicit
 * user id. Never import this from a user-facing request path.
 */

export type RolloverSummary = {
  users: number;
  widgets: number;
  recomputed: number;
  freezesDecremented: number;
};

export async function runRollover(): Promise<RolloverSummary> {
  const allProfiles = await db
    .select({ userId: profiles.userId, timezone: profiles.timezone })
    .from(profiles);

  const summary: RolloverSummary = {
    users: allProfiles.length,
    widgets: 0,
    recomputed: 0,
    freezesDecremented: 0,
  };

  for (const p of allProfiles) {
    const tz = p.timezone || "UTC";
    const asOf = todayInTimeZone(tz);
    const month = asOf.slice(0, 7); // YYYY-MM

    const userWidgets = await db
      .select()
      .from(widgets)
      .where(eq(widgets.userId, p.userId));

    for (const w of userWidgets) {
      if (!isStreakType(w.type)) continue;
      summary.widgets++;

      // Recompute is a pure function of the logs → safe to run repeatedly.
      await recomputeStreakForUser(
        p.userId,
        {
          id: w.id,
          type: w.type,
          schedule: w.schedule,
          target: w.target ?? null,
        },
        asOf,
      );
      summary.recomputed++;

      // Monthly freeze decrement, guarded by last_freeze_month for idempotency.
      const [s] = await db
        .select({
          freezesAvailable: streaks.freezesAvailable,
          lastFreezeMonth: streaks.lastFreezeMonth,
        })
        .from(streaks)
        .where(and(eq(streaks.userId, p.userId), eq(streaks.widgetId, w.id)))
        .limit(1);

      if (s && s.lastFreezeMonth !== month) {
        const next = Math.max(0, (s.freezesAvailable ?? 0) - 1);
        await db
          .update(streaks)
          .set({ freezesAvailable: next, lastFreezeMonth: month })
          .where(and(eq(streaks.userId, p.userId), eq(streaks.widgetId, w.id)));
        if ((s.freezesAvailable ?? 0) !== next) summary.freezesDecremented++;
      }
    }
  }

  return summary;
}

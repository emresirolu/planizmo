import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { assistantMessages, profiles, streaks, users, widgets } from "./schema";
import { recomputeStreakForUser } from "@/lib/widgets/streak-service";
import { syncHealthForUser } from "@/lib/health/sync";
import { todayInTimeZone } from "@/lib/widgets/date";
import { mondayOf } from "@/lib/widgets/streak";
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

export type HealthSyncSummary = { users: number; synced: number; failed: number };

/** Sync sleep + steps for every user from the active provider. Idempotent. */
export async function runHealthSyncAll(): Promise<HealthSyncSummary> {
  const allProfiles = await db
    .select({ userId: profiles.userId, timezone: profiles.timezone, plan: profiles.plan, email: users.email })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId));
  const summary: HealthSyncSummary = { users: allProfiles.length, synced: 0, failed: 0 };
  for (const p of allProfiles) {
    if (p.plan !== "pro") continue; // health auto-sync is a Pro feature
    try {
      // syncHealthForUser self-skips anyone without a resolved provider
      // (mock = demo only; real = connected only), so real users get nothing.
      const r = await syncHealthForUser(p.userId, p.timezone || "UTC", p.email);
      summary.synced += r.synced;
    } catch {
      summary.failed++; // e.g. a real provider not connected — never blocks others
    }
  }
  return summary;
}

export type NudgeSummary = { users: number; nudged: number };

const NUDGE_TEXT =
  "It's a good moment to plan the week ahead — want to lay out Monday to Sunday together? Open the planner whenever you're ready, no pressure.";

/**
 * Sunday nudge: drop one gentle "plan your week" invitation into each user's
 * assistant rail. Idempotent — at most one nudge per user per (local) week.
 */
export async function runWeeklyNudge(): Promise<NudgeSummary> {
  const allProfiles = await db
    .select({ userId: profiles.userId, timezone: profiles.timezone })
    .from(profiles);

  const summary: NudgeSummary = { users: allProfiles.length, nudged: 0 };

  for (const p of allProfiles) {
    const weekStart = mondayOf(todayInTimeZone(p.timezone || "UTC"));

    const existing = await db
      .select({ id: assistantMessages.id })
      .from(assistantMessages)
      .where(
        and(
          eq(assistantMessages.userId, p.userId),
          sql`${assistantMessages.contextJson} ->> 'op' = 'nudge'`,
          sql`${assistantMessages.contextJson} ->> 'week_start' = ${weekStart}`,
        ),
      )
      .limit(1);
    if (existing.length > 0) continue;

    await db.insert(assistantMessages).values({
      userId: p.userId,
      role: "assistant",
      content: NUDGE_TEXT,
      contextJson: { op: "nudge", date: weekStart, week_start: weekStart },
    });
    summary.nudged++;
  }

  return summary;
}

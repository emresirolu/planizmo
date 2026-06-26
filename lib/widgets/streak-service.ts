import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { checklistItems, checklistLogs, logs, streaks } from "@/lib/db/schema";
import { getMyWidget, requireUserId } from "@/lib/db/scoped";
import { addDays, computeStreak } from "./streak";
import { isStreakType, type StreakStats, type WidgetType } from "./types";

const WINDOW_DAYS = 120;

type StreakWidget = {
  id: string;
  type: WidgetType;
  schedule: "daily" | "weekdays" | "times_per_week";
  target: number | null;
};

/**
 * Build a widget's set of day-level completions for `userId` since `fromDate`.
 *
 * Note: queries here always filter by the explicit `userId` argument — this is
 * the same ownership guarantee scoped.ts enforces, but expressed for system
 * contexts (the cron) that operate per-user without a session.
 */
async function completedDatesFor(
  userId: string,
  widget: StreakWidget,
  fromDate: string,
): Promise<Set<string>> {
  const set = new Set<string>();

  if (widget.type === "checklist") {
    const items = await db
      .select({ id: checklistItems.id })
      .from(checklistItems)
      .where(
        and(
          eq(checklistItems.userId, userId),
          eq(checklistItems.widgetId, widget.id),
        ),
      );
    const n = items.length;
    if (n === 0) return set;

    const rows = await db
      .select({ date: checklistLogs.date, completed: checklistLogs.completed })
      .from(checklistLogs)
      .where(
        and(
          eq(checklistLogs.userId, userId),
          eq(checklistLogs.widgetId, widget.id),
          gte(checklistLogs.date, fromDate),
        ),
      );
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (r.completed) counts.set(r.date, (counts.get(r.date) ?? 0) + 1);
    }
    for (const [date, c] of counts) if (c >= n) set.add(date);
    return set;
  }

  const rows = await db
    .select({ date: logs.date, completed: logs.completed })
    .from(logs)
    .where(
      and(
        eq(logs.userId, userId),
        eq(logs.widgetId, widget.id),
        gte(logs.date, fromDate),
      ),
    );
  for (const r of rows) if (r.completed) set.add(r.date);
  return set;
}

/** Recompute and persist the streak row for one widget. Idempotent. */
export async function recomputeStreakForUser(
  userId: string,
  widget: StreakWidget,
  asOf: string,
): Promise<StreakStats | null> {
  if (!isStreakType(widget.type)) return null;

  const fromDate = addDays(asOf, -WINDOW_DAYS);
  const completedDates = await completedDatesFor(userId, widget, fromDate);

  const [existing] = await db
    .select({ longestStreak: streaks.longestStreak })
    .from(streaks)
    .where(and(eq(streaks.userId, userId), eq(streaks.widgetId, widget.id)))
    .limit(1);

  const res = computeStreak({
    schedule: widget.schedule,
    target: widget.target,
    completedDates,
    asOf,
    storedLongest: existing?.longestStreak ?? 0,
  });

  const set = {
    currentStreak: res.currentStreak,
    longestStreak: res.longestStreak,
    strength: String(res.strength),
    lastCompletedDate: res.lastCompletedDate,
  };
  await db
    .insert(streaks)
    .values({ userId, widgetId: widget.id, ...set })
    .onConflictDoUpdate({ target: streaks.widgetId, set });

  return {
    currentStreak: res.currentStreak,
    longestStreak: res.longestStreak,
    strength: res.strength,
  };
}

/** Session wrapper: recompute the current user's widget after a log change. */
export async function recomputeMyStreak(
  widgetId: string,
  asOf: string,
): Promise<StreakStats | null> {
  const userId = await requireUserId();
  const widget = await getMyWidget(widgetId);
  if (!widget || !isStreakType(widget.type)) return null;
  return recomputeStreakForUser(
    userId,
    {
      id: widget.id,
      type: widget.type,
      schedule: widget.schedule,
      target: widget.target ?? null,
    },
    asOf,
  );
}

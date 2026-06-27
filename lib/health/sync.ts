import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { logs, widgets } from "@/lib/db/schema";
import { addDays } from "@/lib/widgets/streak";
import { recomputeStreakForUser } from "@/lib/widgets/streak-service";
import { getProvider, isRealProviderActive } from "./provider";
import { SLEEP_TARGET, STEPS_TARGET } from "./types";

const BACKFILL_DAYS = 60;

type HealthWidgetIds = { sleepId: string; stepsId: string };

/** Find (or create) the user's Sleep + Steps health widgets. */
export async function ensureHealthWidgets(userId: string): Promise<HealthWidgetIds> {
  const owned = await db.select().from(widgets).where(eq(widgets.userId, userId));
  let sleep = owned.find((w) => w.type === "health" && (w.unit === "hours" || /sleep/i.test(w.title)));
  let steps = owned.find((w) => w.type === "health" && (w.unit === "steps" || /steps/i.test(w.title)));

  let nextPos = owned.reduce((m, w) => Math.max(m, w.position), -1) + 1;

  if (!sleep) {
    [sleep] = await db
      .insert(widgets)
      .values({ userId, type: "health", title: "Sleep", icon: "sleep", schedule: "daily", target: SLEEP_TARGET, unit: "hours", size: "2x1", source: "manual", position: nextPos++ })
      .returning();
  }
  if (!steps) {
    [steps] = await db
      .insert(widgets)
      .values({ userId, type: "health", title: "Steps", icon: "steps", schedule: "daily", target: STEPS_TARGET, unit: "steps", size: "2x1", source: "manual", position: nextPos++ })
      .returning();
  }
  return { sleepId: sleep.id, stepsId: steps.id };
}

async function upsertLog(userId: string, widgetId: string, date: string, value: number, completed: boolean) {
  await db
    .insert(logs)
    .values({ userId, widgetId, date, value: String(value), completed })
    .onConflictDoUpdate({ target: [logs.widgetId, logs.date], set: { value: String(value), completed } });
}

/**
 * Sync sleep + steps for a user from the active provider into their health
 * widgets' logs. Backfills ~60 days. Idempotent (re-running yields the same
 * deterministic values for mock; real provider returns the same history).
 * Recomputes streaks for the synced widgets so strength reflects the new logs.
 */
export async function syncHealthForUser(
  userId: string,
  tz: string,
): Promise<{ synced: number; days: number; provider: string }> {
  const provider = getProvider();
  const { sleepId, stepsId } = await ensureHealthWidgets(userId);

  // resolve "today" in the user's timezone
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz || "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const from = addDays(today, -(BACKFILL_DAYS - 1));

  const data = await provider.fetchRange(userId, from, today);
  let synced = 0;
  for (const d of data) {
    if (d.sleepHours != null) {
      await upsertLog(userId, sleepId, d.date, d.sleepHours, d.sleepHours >= SLEEP_TARGET);
      synced++;
    }
    if (d.steps != null) {
      await upsertLog(userId, stepsId, d.date, d.steps, d.steps >= STEPS_TARGET);
      synced++;
    }
  }

  if (isRealProviderActive()) {
    await db.update(widgets).set({ source: "fitbit" }).where(and(eq(widgets.userId, userId), eq(widgets.id, sleepId)));
    await db.update(widgets).set({ source: "fitbit" }).where(and(eq(widgets.userId, userId), eq(widgets.id, stepsId)));
  }

  // keep streak/strength in step with the synced logs
  for (const id of [sleepId, stepsId]) {
    await recomputeStreakForUser(userId, { id, type: "health", schedule: "daily", target: id === sleepId ? SLEEP_TARGET : STEPS_TARGET }, today);
  }

  return { synced, days: data.length, provider: provider.name };
}

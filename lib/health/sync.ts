import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { integrations, logs, widgets } from "@/lib/db/schema";
import { addDays } from "@/lib/widgets/streak";
import { recomputeStreakForUser } from "@/lib/widgets/streak-service";
import { isDemoEmail, selectedProviderName } from "./provider";
import { fitbitConfigured, fitbitProvider } from "./fitbit";
import { mockProvider } from "./mock";
import { SLEEP_TARGET, STEPS_TARGET, type HealthProvider } from "./types";

const BACKFILL_DAYS = 60;

/**
 * Resolve which provider (if any) should produce health data for THIS user.
 * No fabricated data for real users: mock is scoped to the demo account; real
 * providers only run for users who connected one. Everyone else → null (skip).
 */
export async function resolveUserProvider(
  userId: string,
  email: string | null,
): Promise<HealthProvider | null> {
  const mode = selectedProviderName();
  if (mode === "fitbit" && fitbitConfigured()) {
    const [intg] = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.provider, "fitbit")))
      .limit(1);
    return intg ? fitbitProvider : null; // only connected accounts
  }
  if (mode === "mock" && isDemoEmail(email)) return mockProvider; // demo only
  return null;
}

/** Provider name for UI ("fitbit" | "mock" | "none"). */
export async function userHealthProviderName(
  userId: string,
  email: string | null,
): Promise<"fitbit" | "mock" | "none"> {
  const p = await resolveUserProvider(userId, email);
  return p ? (p.name as "fitbit" | "mock") : "none";
}

type HealthWidgetIds = { sleepId: string; stepsId: string };

async function ensureHealthWidgets(userId: string): Promise<HealthWidgetIds> {
  const owned = await db.select().from(widgets).where(eq(widgets.userId, userId));
  let sleep = owned.find((w) => w.type === "health" && (w.unit === "hours" || /sleep/i.test(w.title)));
  let steps = owned.find((w) => w.type === "health" && (w.unit === "steps" || /steps/i.test(w.title)));
  let nextPos = owned.reduce((m, w) => Math.max(m, w.position), -1) + 1;
  if (!sleep) {
    [sleep] = await db.insert(widgets).values({ userId, type: "health", title: "Sleep", icon: "sleep", schedule: "daily", target: SLEEP_TARGET, unit: "hours", size: "2x1", source: "manual", position: nextPos++ }).returning();
  }
  if (!steps) {
    [steps] = await db.insert(widgets).values({ userId, type: "health", title: "Steps", icon: "steps", schedule: "daily", target: STEPS_TARGET, unit: "steps", size: "2x1", source: "manual", position: nextPos++ }).returning();
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
 * Sync health for a user — ONLY if they have a resolved provider (demo or a
 * connected real provider). For everyone else this writes nothing (no widgets,
 * no logs), so real accounts never see fabricated sleep/steps.
 */
export async function syncHealthForUser(
  userId: string,
  tz: string,
  email: string | null,
): Promise<{ synced: number; days: number; provider: string; skipped?: boolean }> {
  const provider = await resolveUserProvider(userId, email);
  if (!provider) return { synced: 0, days: 0, provider: "none", skipped: true };

  const { sleepId, stepsId } = await ensureHealthWidgets(userId);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz || "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const from = addDays(today, -(BACKFILL_DAYS - 1));

  const data = await provider.fetchRange(userId, from, today);
  let synced = 0;
  for (const d of data) {
    if (d.sleepHours != null) { await upsertLog(userId, sleepId, d.date, d.sleepHours, d.sleepHours >= SLEEP_TARGET); synced++; }
    if (d.steps != null) { await upsertLog(userId, stepsId, d.date, d.steps, d.steps >= STEPS_TARGET); synced++; }
  }

  if (provider.name === "fitbit") {
    await db.update(widgets).set({ source: "fitbit" }).where(and(eq(widgets.userId, userId), eq(widgets.id, sleepId)));
    await db.update(widgets).set({ source: "fitbit" }).where(and(eq(widgets.userId, userId), eq(widgets.id, stepsId)));
  }

  for (const id of [sleepId, stepsId]) {
    await recomputeStreakForUser(userId, { id, type: "health", schedule: "daily", target: id === sleepId ? SLEEP_TARGET : STEPS_TARGET }, today);
  }

  return { synced, days: data.length, provider: provider.name };
}

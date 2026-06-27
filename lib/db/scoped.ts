import "server-only";
import { and, asc, desc, eq, gte, sql, type SQL } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "./index";
import {
  assistantMessages,
  checklistItems,
  checklistLogs,
  goals,
  layouts,
  logs,
  profiles,
  streaks,
  tasks,
  timeBlocks,
  weekPlans,
  widgets,
} from "./schema";
import type { ClientGoal, GoalStatus } from "@/lib/goals/types";
import type { WeekPlan } from "@/lib/plan/types";
import type { ClientWidget } from "@/lib/widgets/types";
import { todayInTimeZone } from "@/lib/widgets/date";
import { mondayOf } from "@/lib/widgets/streak";

/**
 * Security baseline (replaces Postgres RLS).
 *
 * Authorization is enforced in the app layer: there is exactly one way to get a
 * user id — from the authenticated session — and every read/write below derives
 * its `user_id` filter from it. A query physically cannot span users because the
 * caller never supplies the id; it is always injected here.
 *
 * Rule: data access for the signed-in user goes through this module. Do not
 * import `db` directly in feature code to read/write user-owned rows.
 */

export class UnauthenticatedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthenticatedError";
  }
}

/** The current session user id, or throw. Never trusts client-supplied ids. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new UnauthenticatedError();
  return id;
}

/**
 * Combine the mandatory `user_id = <session user>` predicate with any
 * additional filters. Use this whenever you build a query by hand so the
 * ownership check can never be forgotten.
 */
export async function ownedBy(
  column: Parameters<typeof eq>[0],
  ...extra: Array<SQL | undefined>
): Promise<SQL> {
  const userId = await requireUserId();
  return and(eq(column, userId), ...extra) as SQL;
}

/* ---------------------------------------------------------------------------
 * Profiles — the only user-owned table read/written so far.
 * ------------------------------------------------------------------------- */

export type Profile = typeof profiles.$inferSelect;

export async function getMyProfile(): Promise<Profile | null> {
  const userId = await requireUserId();
  const [row] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function updateMyProfile(
  patch: Partial<{
    displayName: string | null;
    timezone: string;
    theme: string;
    accentColor: string;
  }>,
): Promise<Profile | null> {
  const userId = await requireUserId();
  const [row] = await db
    .update(profiles)
    .set(patch)
    .where(eq(profiles.userId, userId))
    .returning();
  return row ?? null;
}

export async function getMyTimezone(): Promise<string> {
  const profile = await getMyProfile();
  return profile?.timezone || "UTC";
}

/* ---------------------------------------------------------------------------
 * Plan + usage metering (Milestone 11). Plan is the source of truth for gating.
 * ------------------------------------------------------------------------- */

export async function getMyPlan(): Promise<"free" | "pro"> {
  const profile = await getMyProfile();
  return (profile?.plan as "free" | "pro") ?? "free";
}

export async function countActiveGoals(): Promise<number> {
  const userId = await requireUserId();
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.status, "active")));
  return r?.n ?? 0;
}

export async function countWeekPlansSince(since: Date): Promise<number> {
  const userId = await requireUserId();
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(weekPlans)
    .where(and(eq(weekPlans.userId, userId), gte(weekPlans.createdAt, since)));
  return r?.n ?? 0;
}

/** Count metered AI actions (tagged in assistant_messages.context_json.action). */
export async function countActionsSince(action: string, since: Date): Promise<number> {
  const userId = await requireUserId();
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(assistantMessages)
    .where(
      and(
        eq(assistantMessages.userId, userId),
        eq(assistantMessages.role, "user"),
        gte(assistantMessages.createdAt, since),
        sql`${assistantMessages.contextJson} ->> 'action' = ${action}`,
      ),
    );
  return r?.n ?? 0;
}

export type ViewMode = "flow" | "timeline";

export async function getMyViewMode(): Promise<ViewMode> {
  const profile = await getMyProfile();
  return (profile?.viewMode as ViewMode) ?? "flow";
}

export async function setMyViewMode(mode: ViewMode): Promise<void> {
  const userId = await requireUserId();
  await db.update(profiles).set({ viewMode: mode }).where(eq(profiles.userId, userId));
}

/* ---------------------------------------------------------------------------
 * Widgets — every query is scoped to the session user.
 * ------------------------------------------------------------------------- */

export type Widget = typeof widgets.$inferSelect;

export function toClientWidget(w: Widget): ClientWidget {
  return {
    id: w.id,
    type: w.type,
    title: w.title,
    icon: w.icon ?? "counter",
    schedule: w.schedule,
    target: w.target ?? null,
    unit: w.unit ?? null,
    size: w.size,
    position: w.position,
  };
}

export async function listMyWidgets(): Promise<Widget[]> {
  const userId = await requireUserId();
  return db
    .select()
    .from(widgets)
    .where(eq(widgets.userId, userId))
    .orderBy(widgets.position, widgets.createdAt);
}

export async function getMyWidget(widgetId: string): Promise<Widget | null> {
  const userId = await requireUserId();
  const [row] = await db
    .select()
    .from(widgets)
    .where(and(eq(widgets.userId, userId), eq(widgets.id, widgetId)))
    .limit(1);
  return row ?? null;
}

export async function addWidget(values: {
  type: Widget["type"];
  title: string;
  icon: string;
  schedule: Widget["schedule"];
  target: number | null;
  unit: string | null;
  size: Widget["size"];
}): Promise<Widget> {
  const userId = await requireUserId();

  // Append to the end of the user's grid.
  const [last] = await db
    .select({ position: widgets.position })
    .from(widgets)
    .where(eq(widgets.userId, userId))
    .orderBy(desc(widgets.position))
    .limit(1);
  const position = (last?.position ?? -1) + 1;

  const [row] = await db
    .insert(widgets)
    .values({ ...values, userId, position, source: "manual" })
    .returning();
  return row;
}

/* ---------------------------------------------------------------------------
 * Layout (grid arrangement snapshot, per the existing layouts table)
 * ------------------------------------------------------------------------- */

export async function getLayout(): Promise<Record<string, unknown> | null> {
  const userId = await requireUserId();
  const [row] = await db
    .select({ layoutJson: layouts.layoutJson })
    .from(layouts)
    .where(eq(layouts.userId, userId))
    .limit(1);
  return (row?.layoutJson as Record<string, unknown> | null) ?? null;
}

export async function saveLayout(json: Record<string, unknown>): Promise<void> {
  const userId = await requireUserId();
  const [existing] = await db
    .select({ id: layouts.id })
    .from(layouts)
    .where(eq(layouts.userId, userId))
    .limit(1);
  if (existing) {
    await db.update(layouts).set({ layoutJson: json }).where(eq(layouts.id, existing.id));
  } else {
    await db.insert(layouts).values({ userId, layoutJson: json });
  }
}

/** Reorder widgets by setting position to the index in `orderedIds`. */
export async function setWidgetPositions(orderedIds: string[]): Promise<void> {
  const userId = await requireUserId();
  await Promise.all(
    orderedIds.map((id, i) =>
      db
        .update(widgets)
        .set({ position: i })
        .where(and(eq(widgets.userId, userId), eq(widgets.id, id))),
    ),
  );
}

export async function removeWidget(widgetId: string): Promise<boolean> {
  const userId = await requireUserId();
  const deleted = await db
    .delete(widgets)
    .where(and(eq(widgets.userId, userId), eq(widgets.id, widgetId)))
    .returning({ id: widgets.id });
  return deleted.length > 0;
}

/* ---------------------------------------------------------------------------
 * Logs — one row per (widget, day); upserted on the unique index.
 * ------------------------------------------------------------------------- */

export type Log = typeof logs.$inferSelect;

export async function getTodayLogs(date: string): Promise<Log[]> {
  const userId = await requireUserId();
  return db
    .select()
    .from(logs)
    .where(and(eq(logs.userId, userId), eq(logs.date, date)));
}

export async function getLog(
  widgetId: string,
  date: string,
): Promise<Log | null> {
  const userId = await requireUserId();
  const [row] = await db
    .select()
    .from(logs)
    .where(
      and(
        eq(logs.userId, userId),
        eq(logs.widgetId, widgetId),
        eq(logs.date, date),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function upsertLog(
  widgetId: string,
  date: string,
  data: { value: number | null; completed: boolean },
): Promise<Log> {
  const userId = await requireUserId();
  const value = data.value != null ? String(data.value) : null;
  const [row] = await db
    .insert(logs)
    .values({ userId, widgetId, date, value, completed: data.completed })
    .onConflictDoUpdate({
      target: [logs.widgetId, logs.date],
      set: { value, completed: data.completed },
    })
    .returning();
  return row;
}

export async function updateWidget(
  widgetId: string,
  patch: Partial<{
    title: string;
    target: number | null;
    unit: string | null;
    schedule: Widget["schedule"];
    size: Widget["size"];
  }>,
): Promise<Widget | null> {
  const userId = await requireUserId();
  const [row] = await db
    .update(widgets)
    .set(patch)
    .where(and(eq(widgets.userId, userId), eq(widgets.id, widgetId)))
    .returning();
  return row ?? null;
}

/* ---------------------------------------------------------------------------
 * Health snapshot + summary (Milestone 8)
 * ------------------------------------------------------------------------- */

async function findHealthWidgets(userId: string) {
  const hw = await db
    .select()
    .from(widgets)
    .where(and(eq(widgets.userId, userId), eq(widgets.type, "health")));
  return {
    sleep: hw.find((w) => w.unit === "hours" || /sleep/i.test(w.title)) ?? null,
    steps: hw.find((w) => w.unit === "steps" || /steps/i.test(w.title)) ?? null,
  };
}

/** Compact health for a date — feeds the AI context. Nulls when not synced. */
export async function getHealthSnapshot(
  date: string,
): Promise<{ sleepHours: number | null; steps: number | null }> {
  const userId = await requireUserId();
  const { sleep, steps } = await findHealthWidgets(userId);
  const valueOn = async (widgetId: string) => {
    const [l] = await db
      .select({ value: logs.value })
      .from(logs)
      .where(and(eq(logs.userId, userId), eq(logs.widgetId, widgetId), eq(logs.date, date)))
      .limit(1);
    return l?.value != null ? Number(l.value) : null;
  };
  return {
    sleepHours: sleep ? await valueOn(sleep.id) : null,
    steps: steps ? await valueOn(steps.id) : null,
  };
}

export type HealthSummary = {
  sleepHours: number | null;
  sleepTarget: number;
  steps: number | null;
  stepsTarget: number;
  workout: { title: string; done: number; target: number | null } | null;
  provider: "mock" | "fitbit";
};

/** Health Summary panel data (Sleep/Steps from sync; Workout from gym habit). */
export async function getHealthSummary(): Promise<HealthSummary> {
  const userId = await requireUserId();
  const profile = await getMyProfile();
  const tz = profile?.timezone || "UTC";
  const today = todayInTimeZone(tz);
  const snap = await getHealthSnapshot(today);

  const all = await db.select().from(widgets).where(eq(widgets.userId, userId));
  const gym = all.find(
    (w) => (w.type === "habit" || w.type === "health") && /gym|workout|exercise|lift|train/i.test(w.title),
  );
  let workout: HealthSummary["workout"] = null;
  if (gym) {
    const weekStart = mondayOf(today);
    const wl = await db
      .select({ date: logs.date, completed: logs.completed })
      .from(logs)
      .where(and(eq(logs.userId, userId), eq(logs.widgetId, gym.id), gte(logs.date, weekStart)));
    const done = wl.filter((l) => l.completed && l.date <= today).length;
    workout = { title: gym.title, done, target: gym.target ?? null };
  }

  return {
    sleepHours: snap.sleepHours,
    sleepTarget: 8,
    steps: snap.steps,
    stepsTarget: 8000,
    workout,
    provider: process.env.HEALTH_PROVIDER === "fitbit" ? "fitbit" : "mock",
  };
}

/* ---------------------------------------------------------------------------
 * Goals (long-term objectives)
 * ------------------------------------------------------------------------- */

export type Goal = typeof goals.$inferSelect;

export function toClientGoal(g: Goal): ClientGoal {
  return {
    id: g.id,
    title: g.title,
    icon: g.icon ?? "goal",
    description: g.description,
    progressPct: g.progressPct,
    nextStep: g.nextStep,
    status: g.status,
    targetDate: g.targetDate,
    position: g.position,
  };
}

export async function listGoals(): Promise<Goal[]> {
  const userId = await requireUserId();
  return db
    .select()
    .from(goals)
    .where(eq(goals.userId, userId))
    .orderBy(asc(goals.position), asc(goals.createdAt));
}

export async function addGoal(input: {
  title: string;
  icon?: string | null;
  description?: string | null;
  nextStep?: string | null;
  progressPct?: number;
  targetDate?: string | null;
  linkedWidgetId?: string | null;
}): Promise<Goal> {
  const userId = await requireUserId();
  const [last] = await db
    .select({ position: goals.position })
    .from(goals)
    .where(eq(goals.userId, userId))
    .orderBy(desc(goals.position))
    .limit(1);
  const position = (last?.position ?? -1) + 1;
  const [row] = await db
    .insert(goals)
    .values({
      userId,
      title: input.title,
      icon: input.icon ?? "goal",
      description: input.description ?? null,
      nextStep: input.nextStep ?? null,
      progressPct: input.progressPct ?? 0,
      targetDate: input.targetDate ?? null,
      linkedWidgetId: input.linkedWidgetId ?? null,
      position,
    })
    .returning();
  return row;
}

export async function updateGoal(
  goalId: string,
  patch: Partial<{
    title: string;
    icon: string;
    description: string | null;
    nextStep: string | null;
    progressPct: number;
    status: GoalStatus;
    targetDate: string | null;
  }>,
): Promise<Goal | null> {
  const userId = await requireUserId();
  const [row] = await db
    .update(goals)
    .set(patch)
    .where(and(eq(goals.userId, userId), eq(goals.id, goalId)))
    .returning();
  return row ?? null;
}

export async function deleteGoal(goalId: string): Promise<boolean> {
  const userId = await requireUserId();
  const deleted = await db
    .delete(goals)
    .where(and(eq(goals.userId, userId), eq(goals.id, goalId)))
    .returning({ id: goals.id });
  return deleted.length > 0;
}

export async function setGoalPositions(orderedIds: string[]): Promise<void> {
  const userId = await requireUserId();
  await Promise.all(
    orderedIds.map((id, i) =>
      db.update(goals).set({ position: i }).where(and(eq(goals.userId, userId), eq(goals.id, id))),
    ),
  );
}

/** All of the user's logs since `fromDate` (inclusive). For heatmaps/streaks. */
export async function getLogsSince(fromDate: string): Promise<Log[]> {
  const userId = await requireUserId();
  return db
    .select()
    .from(logs)
    .where(and(eq(logs.userId, userId), gte(logs.date, fromDate)));
}

/* ---------------------------------------------------------------------------
 * Streaks
 * ------------------------------------------------------------------------- */

export type Streak = typeof streaks.$inferSelect;

export async function listStreaks(): Promise<Streak[]> {
  const userId = await requireUserId();
  return db.select().from(streaks).where(eq(streaks.userId, userId));
}

export async function getStreak(widgetId: string): Promise<Streak | null> {
  const userId = await requireUserId();
  const [row] = await db
    .select()
    .from(streaks)
    .where(and(eq(streaks.userId, userId), eq(streaks.widgetId, widgetId)))
    .limit(1);
  return row ?? null;
}

export async function upsertStreak(
  widgetId: string,
  data: {
    currentStreak: number;
    longestStreak: number;
    strength: number;
    lastCompletedDate: string | null;
    freezesAvailable?: number;
    lastFreezeMonth?: string | null;
  },
): Promise<Streak> {
  const userId = await requireUserId();
  const set: Record<string, unknown> = {
    currentStreak: data.currentStreak,
    longestStreak: data.longestStreak,
    strength: String(data.strength),
    lastCompletedDate: data.lastCompletedDate,
  };
  if (data.freezesAvailable !== undefined)
    set.freezesAvailable = data.freezesAvailable;
  if (data.lastFreezeMonth !== undefined)
    set.lastFreezeMonth = data.lastFreezeMonth;

  const [row] = await db
    .insert(streaks)
    .values({ userId, widgetId, ...(set as object) })
    .onConflictDoUpdate({ target: streaks.widgetId, set })
    .returning();
  return row;
}

/* ---------------------------------------------------------------------------
 * Checklist items + logs
 * ------------------------------------------------------------------------- */

export type ChecklistItemRow = typeof checklistItems.$inferSelect;
export type ChecklistLogRow = typeof checklistLogs.$inferSelect;

export async function listChecklistItems(): Promise<ChecklistItemRow[]> {
  const userId = await requireUserId();
  return db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.userId, userId))
    .orderBy(asc(checklistItems.position), asc(checklistItems.createdAt));
}

export async function addChecklistItem(
  widgetId: string,
  label: string,
): Promise<ChecklistItemRow | null> {
  const userId = await requireUserId();
  const owned = await getMyWidget(widgetId);
  if (!owned) return null;

  const [last] = await db
    .select({ position: checklistItems.position })
    .from(checklistItems)
    .where(
      and(
        eq(checklistItems.userId, userId),
        eq(checklistItems.widgetId, widgetId),
      ),
    )
    .orderBy(desc(checklistItems.position))
    .limit(1);
  const position = (last?.position ?? -1) + 1;

  const [row] = await db
    .insert(checklistItems)
    .values({ userId, widgetId, label, position })
    .returning();
  return row;
}

export async function updateChecklistItem(
  itemId: string,
  label: string,
): Promise<boolean> {
  const userId = await requireUserId();
  const updated = await db
    .update(checklistItems)
    .set({ label })
    .where(and(eq(checklistItems.userId, userId), eq(checklistItems.id, itemId)))
    .returning({ id: checklistItems.id });
  return updated.length > 0;
}

export async function removeChecklistItem(itemId: string): Promise<boolean> {
  const userId = await requireUserId();
  const deleted = await db
    .delete(checklistItems)
    .where(and(eq(checklistItems.userId, userId), eq(checklistItems.id, itemId)))
    .returning({ id: checklistItems.id });
  return deleted.length > 0;
}

/** Checklist logs since `fromDate` (only completed ticks are stored). */
export async function getChecklistLogsSince(
  fromDate: string,
): Promise<ChecklistLogRow[]> {
  const userId = await requireUserId();
  return db
    .select()
    .from(checklistLogs)
    .where(
      and(eq(checklistLogs.userId, userId), gte(checklistLogs.date, fromDate)),
    );
}

export async function setChecklistLog(
  itemId: string,
  date: string,
  completed: boolean,
): Promise<{ widgetId: string } | null> {
  const userId = await requireUserId();
  // Verify the item belongs to the user and resolve its widget.
  const [item] = await db
    .select({ widgetId: checklistItems.widgetId })
    .from(checklistItems)
    .where(and(eq(checklistItems.userId, userId), eq(checklistItems.id, itemId)))
    .limit(1);
  if (!item) return null;

  await db
    .insert(checklistLogs)
    .values({ userId, widgetId: item.widgetId, itemId, date, completed })
    .onConflictDoUpdate({
      target: [checklistLogs.itemId, checklistLogs.date],
      set: { completed },
    });
  return { widgetId: item.widgetId };
}

/* ---------------------------------------------------------------------------
 * Tasks
 * ------------------------------------------------------------------------- */

export type TaskRow = typeof tasks.$inferSelect;

export async function listTasks(): Promise<TaskRow[]> {
  const userId = await requireUserId();
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(asc(tasks.completed), asc(tasks.dueDate), asc(tasks.createdAt));
}

export async function addTask(input: {
  widgetId: string | null;
  title: string;
  notes?: string | null;
  dueDate?: string | null;
}): Promise<TaskRow | null> {
  const userId = await requireUserId();
  if (input.widgetId) {
    const owned = await getMyWidget(input.widgetId);
    if (!owned) return null;
  }
  const [row] = await db
    .insert(tasks)
    .values({
      userId,
      widgetId: input.widgetId,
      title: input.title,
      notes: input.notes ?? null,
      dueDate: input.dueDate ?? null,
    })
    .returning();
  return row;
}

export async function updateTask(
  taskId: string,
  patch: Partial<{
    title: string;
    notes: string | null;
    dueDate: string | null;
    completed: boolean;
    completedAt: Date | null;
  }>,
): Promise<boolean> {
  const userId = await requireUserId();
  const updated = await db
    .update(tasks)
    .set(patch)
    .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)))
    .returning({ id: tasks.id });
  return updated.length > 0;
}

export async function deleteTask(taskId: string): Promise<boolean> {
  const userId = await requireUserId();
  const deleted = await db
    .delete(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)))
    .returning({ id: tasks.id });
  return deleted.length > 0;
}

/* ---------------------------------------------------------------------------
 * Assistant messages (AI rail)
 * ------------------------------------------------------------------------- */

export type AssistantMessage = typeof assistantMessages.$inferSelect;

export async function addAssistantMessage(input: {
  role: "user" | "assistant";
  content: string;
  contextJson: unknown;
}): Promise<AssistantMessage> {
  const userId = await requireUserId();
  const [row] = await db
    .insert(assistantMessages)
    .values({
      userId,
      role: input.role,
      content: input.content,
      contextJson: input.contextJson as object,
    })
    .returning();
  return row;
}

/** Recent messages, newest-last (chronological). */
export async function listRecentAssistantMessages(
  limit = 50,
): Promise<AssistantMessage[]> {
  const userId = await requireUserId();
  const rows = await db
    .select()
    .from(assistantMessages)
    .where(eq(assistantMessages.userId, userId))
    .orderBy(desc(assistantMessages.createdAt))
    .limit(limit);
  return rows.reverse();
}

/* ---------------------------------------------------------------------------
 * Week plans (weekly planning ritual)
 * ------------------------------------------------------------------------- */

export type WeekPlanRow = typeof weekPlans.$inferSelect;

export async function getWeekPlan(weekStart: string): Promise<WeekPlanRow | null> {
  const userId = await requireUserId();
  const [row] = await db
    .select()
    .from(weekPlans)
    .where(and(eq(weekPlans.userId, userId), eq(weekPlans.weekStart, weekStart)))
    .limit(1);
  return row ?? null;
}

/** Save (or replace) the draft plan for a week. Re-running planning overwrites. */
export async function upsertWeekPlanDraft(
  weekStart: string,
  brainDumpText: string,
  plan: WeekPlan,
): Promise<WeekPlanRow> {
  const userId = await requireUserId();
  const [row] = await db
    .insert(weekPlans)
    .values({
      userId,
      weekStart,
      brainDumpText,
      planJson: plan,
      status: "draft",
    })
    .onConflictDoUpdate({
      target: [weekPlans.userId, weekPlans.weekStart],
      set: {
        brainDumpText,
        planJson: plan,
        status: "draft",
        approvedAt: null,
      },
    })
    .returning();
  return row;
}

export async function approveWeekPlanRow(
  weekStart: string,
  plan: WeekPlan,
): Promise<WeekPlanRow | null> {
  const userId = await requireUserId();
  const [row] = await db
    .update(weekPlans)
    .set({ planJson: plan, status: "approved", approvedAt: new Date() })
    .where(and(eq(weekPlans.userId, userId), eq(weekPlans.weekStart, weekStart)))
    .returning();
  return row ?? null;
}

/* ---------------------------------------------------------------------------
 * Time blocks (Timeline view)
 * ------------------------------------------------------------------------- */

export type TimeBlock = typeof timeBlocks.$inferSelect;

export async function listTimeBlocks(date: string): Promise<TimeBlock[]> {
  const userId = await requireUserId();
  return db
    .select()
    .from(timeBlocks)
    .where(and(eq(timeBlocks.userId, userId), eq(timeBlocks.date, date)))
    .orderBy(asc(timeBlocks.startTime), asc(timeBlocks.position));
}

export async function addTimeBlock(input: {
  date: string;
  startTime: string; // 'HH:MM'
  durationMin: number;
  title: string;
  category: TimeBlock["category"];
  sourceWidgetId?: string | null;
  sourceTaskId?: string | null;
}): Promise<TimeBlock> {
  const userId = await requireUserId();
  const [row] = await db
    .insert(timeBlocks)
    .values({
      userId,
      date: input.date,
      startTime: input.startTime,
      durationMin: input.durationMin,
      title: input.title,
      category: input.category,
      sourceWidgetId: input.sourceWidgetId ?? null,
      sourceTaskId: input.sourceTaskId ?? null,
    })
    .returning();
  return row;
}

export async function updateTimeBlock(
  id: string,
  patch: Partial<{
    title: string;
    startTime: string;
    durationMin: number;
    category: TimeBlock["category"];
    completed: boolean;
  }>,
): Promise<boolean> {
  const userId = await requireUserId();
  const updated = await db
    .update(timeBlocks)
    .set(patch)
    .where(and(eq(timeBlocks.userId, userId), eq(timeBlocks.id, id)))
    .returning({ id: timeBlocks.id });
  return updated.length > 0;
}

export async function removeTimeBlock(id: string): Promise<boolean> {
  const userId = await requireUserId();
  const deleted = await db
    .delete(timeBlocks)
    .where(and(eq(timeBlocks.userId, userId), eq(timeBlocks.id, id)))
    .returning({ id: timeBlocks.id });
  return deleted.length > 0;
}

/** Remove all of a day's time blocks (used when the AI replans the whole day). */
export async function clearTimeBlocks(date: string): Promise<void> {
  const userId = await requireUserId();
  await db
    .delete(timeBlocks)
    .where(and(eq(timeBlocks.userId, userId), eq(timeBlocks.date, date)));
}

/** First tasks-type widget, or null. Used to attach plan-created tasks. */
export async function firstTasksWidget(): Promise<Widget | null> {
  const userId = await requireUserId();
  const [row] = await db
    .select()
    .from(widgets)
    .where(and(eq(widgets.userId, userId), eq(widgets.type, "tasks")))
    .orderBy(asc(widgets.position), asc(widgets.createdAt))
    .limit(1);
  return row ?? null;
}

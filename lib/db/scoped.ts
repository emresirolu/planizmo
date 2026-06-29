import "server-only";
import { and, asc, desc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "./index";
import {
  assistantMessages,
  bodyMetrics,
  calendarEvents,
  checklistItems,
  checklistLogs,
  financeCategories,
  financeSubscriptions,
  goals,
  integrations,
  layouts,
  logs,
  profiles,
  savingsGoals,
  streaks,
  tasks,
  timeBlocks,
  transactions,
  users,
  weekPlans,
  widgets,
  workouts,
  workoutSets,
} from "./schema";
import { isDemoEmail, realProviderAvailable, selectedProviderName } from "@/lib/health/provider";
import { isOwnerEmail, promoActive, promoUntilLabel, type Plan } from "@/lib/billing/plan";
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

export async function getMyEmail(): Promise<string | null> {
  const userId = await requireUserId();
  const [row] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  return row?.email ?? null;
}

/** The health provider that actually applies to this user (demo/connected/none). */
async function myHealthProvider(): Promise<"mock" | "fitbit" | "none"> {
  const userId = await requireUserId();
  const mode = selectedProviderName();
  if (mode === "fitbit" && realProviderAvailable()) {
    const [i] = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.provider, "fitbit")))
      .limit(1);
    return i ? "fitbit" : "none";
  }
  if (mode === "mock" && isDemoEmail(await getMyEmail())) return "mock";
  return "none";
}

/* ---------------------------------------------------------------------------
 * Plan + usage metering (Milestone 11). Plan is the source of truth for gating.
 * ------------------------------------------------------------------------- */

export type PlanContext = {
  effective: Plan; // what gating uses (promo/owner aware)
  raw: Plan; // the real persisted plan
  promo: boolean; // effective Pro is from the launch promo
  owner: boolean; // effective Pro is from OWNER_EMAILS
  promoUntil: string | null;
};

/** Full plan picture, including the computed promo/owner overrides (no DB writes). */
export async function getPlanContext(): Promise<PlanContext> {
  const profile = await getMyProfile();
  const raw = (profile?.plan as Plan) ?? "free";
  const email = await getMyEmail();
  const owner = isOwnerEmail(email);
  const promo = promoActive();
  const effective: Plan = owner || promo ? "pro" : raw;
  return { effective, raw, promo, owner, promoUntil: promoUntilLabel() };
}

/** Effective plan (promo/owner aware) — the single source of truth for gating. */
export async function getMyPlan(): Promise<"free" | "pro"> {
  return (await getPlanContext()).effective;
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

/** Remove a (widget, day) log entirely. Used to undo a talk-to-log entry that
 *  created a brand-new log (no prior state to restore to). */
export async function deleteLog(widgetId: string, date: string): Promise<void> {
  const userId = await requireUserId();
  await db
    .delete(logs)
    .where(and(eq(logs.userId, userId), eq(logs.widgetId, widgetId), eq(logs.date, date)));
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
  provider: "mock" | "fitbit" | "none";
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
    provider: await myHealthProvider(),
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
    linkedWidgetId: g.linkedWidgetId,
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
    linkedWidgetId: string | null;
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

/* ---------------------------------------------------------------------------
 * Gym — body metrics + workouts (Phase 3). All scoped to the session user.
 * ------------------------------------------------------------------------- */

export type BodyMetric = typeof bodyMetrics.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect;

/** Body metrics from `fromDate` (inclusive), oldest-first — for trend charts. */
export async function getBodyMetricsSince(fromDate: string): Promise<BodyMetric[]> {
  const userId = await requireUserId();
  return db
    .select()
    .from(bodyMetrics)
    .where(and(eq(bodyMetrics.userId, userId), gte(bodyMetrics.date, fromDate)))
    .orderBy(asc(bodyMetrics.date));
}

/** A single day's body-metric row, or null. */
export async function getBodyMetric(date: string): Promise<BodyMetric | null> {
  const userId = await requireUserId();
  const [row] = await db
    .select()
    .from(bodyMetrics)
    .where(and(eq(bodyMetrics.userId, userId), eq(bodyMetrics.date, date)))
    .limit(1);
  return row ?? null;
}

/** Most recent body-metric row (any field), or null. */
export async function latestBodyMetric(): Promise<BodyMetric | null> {
  const userId = await requireUserId();
  const [row] = await db
    .select()
    .from(bodyMetrics)
    .where(eq(bodyMetrics.userId, userId))
    .orderBy(desc(bodyMetrics.date))
    .limit(1);
  return row ?? null;
}

/**
 * Upsert one day's body metrics. Only the fields present in `patch` are written,
 * so logging weight never wipes a previously-logged body-fat reading.
 */
export async function upsertBodyMetric(
  date: string,
  patch: Partial<{ weight: number | null; bodyFatPct: number | null; muscleMass: number | null; notes: string | null }>,
): Promise<BodyMetric> {
  const userId = await requireUserId();
  const set: Record<string, unknown> = {};
  if (patch.weight !== undefined) set.weight = patch.weight == null ? null : String(patch.weight);
  if (patch.bodyFatPct !== undefined) set.bodyFatPct = patch.bodyFatPct == null ? null : String(patch.bodyFatPct);
  if (patch.muscleMass !== undefined) set.muscleMass = patch.muscleMass == null ? null : String(patch.muscleMass);
  if (patch.notes !== undefined) set.notes = patch.notes;

  const [row] = await db
    .insert(bodyMetrics)
    .values({ userId, date, ...(set as object) })
    .onConflictDoUpdate({ target: [bodyMetrics.userId, bodyMetrics.date], set })
    .returning();
  return row;
}

export async function listRecentWorkouts(limit = 30): Promise<Workout[]> {
  const userId = await requireUserId();
  return db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.date), desc(workouts.createdAt))
    .limit(limit);
}

export async function getWorkout(workoutId: string): Promise<Workout | null> {
  const userId = await requireUserId();
  const [row] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.userId, userId), eq(workouts.id, workoutId)))
    .limit(1);
  return row ?? null;
}

export async function addWorkout(input: {
  date: string;
  name: string;
  durationMin: number | null;
  notes: string | null;
}): Promise<Workout> {
  const userId = await requireUserId();
  const [row] = await db
    .insert(workouts)
    .values({
      userId,
      date: input.date,
      name: input.name,
      durationMin: input.durationMin,
      notes: input.notes,
    })
    .returning();
  return row;
}

export async function deleteWorkout(workoutId: string): Promise<boolean> {
  const userId = await requireUserId();
  const deleted = await db
    .delete(workouts)
    .where(and(eq(workouts.userId, userId), eq(workouts.id, workoutId)))
    .returning({ id: workouts.id });
  return deleted.length > 0;
}

/** Add a set to a workout the user owns. Returns null if the workout isn't theirs. */
export async function addWorkoutSet(input: {
  workoutId: string;
  exercise: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  position?: number;
}): Promise<WorkoutSet | null> {
  const userId = await requireUserId();
  const owned = await getWorkout(input.workoutId);
  if (!owned) return null;
  const [row] = await db
    .insert(workoutSets)
    .values({
      userId,
      workoutId: input.workoutId,
      exercise: input.exercise,
      sets: input.sets,
      reps: input.reps,
      weight: input.weight == null ? null : String(input.weight),
      position: input.position ?? 0,
    })
    .returning();
  return row;
}

/** All sets belonging to the given workout ids (and the session user). */
export async function getSetsForWorkoutIds(ids: string[]): Promise<WorkoutSet[]> {
  if (ids.length === 0) return [];
  const userId = await requireUserId();
  return db
    .select()
    .from(workoutSets)
    .where(and(eq(workoutSets.userId, userId), inArray(workoutSets.workoutId, ids)))
    .orderBy(asc(workoutSets.position), asc(workoutSets.createdAt));
}

/* ---------------------------------------------------------------------------
 * Finance (Phase 4) — transactions, categories, subscriptions, savings goals.
 * ------------------------------------------------------------------------- */

export type Transaction = typeof transactions.$inferSelect;
export type FinanceCategory = typeof financeCategories.$inferSelect;
export type FinanceSubscription = typeof financeSubscriptions.$inferSelect;
export type SavingsGoal = typeof savingsGoals.$inferSelect;

export async function getTransactionsSince(fromDate: string): Promise<Transaction[]> {
  const userId = await requireUserId();
  return db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), gte(transactions.date, fromDate)))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));
}

export async function addTransaction(input: {
  date: string;
  amount: number;
  type: "income" | "expense";
  category: string | null;
  note: string | null;
}): Promise<Transaction> {
  const userId = await requireUserId();
  const [row] = await db
    .insert(transactions)
    .values({
      userId,
      date: input.date,
      amount: String(input.amount),
      type: input.type,
      category: input.category,
      note: input.note,
    })
    .returning();
  return row;
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const userId = await requireUserId();
  const deleted = await db
    .delete(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
    .returning({ id: transactions.id });
  return deleted.length > 0;
}

export async function listFinanceCategories(): Promise<FinanceCategory[]> {
  const userId = await requireUserId();
  return db
    .select()
    .from(financeCategories)
    .where(eq(financeCategories.userId, userId))
    .orderBy(asc(financeCategories.name));
}

export async function addFinanceCategory(name: string): Promise<FinanceCategory> {
  const userId = await requireUserId();
  const [row] = await db.insert(financeCategories).values({ userId, name }).returning();
  return row;
}

export async function deleteFinanceCategory(id: string): Promise<boolean> {
  const userId = await requireUserId();
  const deleted = await db
    .delete(financeCategories)
    .where(and(eq(financeCategories.userId, userId), eq(financeCategories.id, id)))
    .returning({ id: financeCategories.id });
  return deleted.length > 0;
}

export async function listFinanceSubscriptions(): Promise<FinanceSubscription[]> {
  const userId = await requireUserId();
  return db
    .select()
    .from(financeSubscriptions)
    .where(eq(financeSubscriptions.userId, userId))
    .orderBy(asc(financeSubscriptions.nextChargeDate), asc(financeSubscriptions.name));
}

export async function addFinanceSubscription(input: {
  name: string;
  amount: number;
  cadence: "weekly" | "monthly" | "quarterly" | "yearly";
  nextChargeDate: string | null;
}): Promise<FinanceSubscription> {
  const userId = await requireUserId();
  const [row] = await db
    .insert(financeSubscriptions)
    .values({
      userId,
      name: input.name,
      amount: String(input.amount),
      cadence: input.cadence,
      nextChargeDate: input.nextChargeDate,
    })
    .returning();
  return row;
}

export async function deleteFinanceSubscription(id: string): Promise<boolean> {
  const userId = await requireUserId();
  const deleted = await db
    .delete(financeSubscriptions)
    .where(and(eq(financeSubscriptions.userId, userId), eq(financeSubscriptions.id, id)))
    .returning({ id: financeSubscriptions.id });
  return deleted.length > 0;
}

export async function listSavingsGoals(): Promise<SavingsGoal[]> {
  const userId = await requireUserId();
  return db
    .select()
    .from(savingsGoals)
    .where(eq(savingsGoals.userId, userId))
    .orderBy(asc(savingsGoals.createdAt));
}

export async function addSavingsGoal(input: {
  name: string;
  targetAmount: number;
  currentAmount: number;
}): Promise<SavingsGoal> {
  const userId = await requireUserId();
  const [row] = await db
    .insert(savingsGoals)
    .values({
      userId,
      name: input.name,
      targetAmount: String(input.targetAmount),
      currentAmount: String(input.currentAmount),
    })
    .returning();
  return row;
}

export async function updateSavingsGoal(
  id: string,
  patch: Partial<{ name: string; targetAmount: number; currentAmount: number }>,
): Promise<SavingsGoal | null> {
  const userId = await requireUserId();
  const set: Record<string, unknown> = {};
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.targetAmount !== undefined) set.targetAmount = String(patch.targetAmount);
  if (patch.currentAmount !== undefined) set.currentAmount = String(patch.currentAmount);
  const [row] = await db
    .update(savingsGoals)
    .set(set)
    .where(and(eq(savingsGoals.userId, userId), eq(savingsGoals.id, id)))
    .returning();
  return row ?? null;
}

export async function deleteSavingsGoal(id: string): Promise<boolean> {
  const userId = await requireUserId();
  const deleted = await db
    .delete(savingsGoals)
    .where(and(eq(savingsGoals.userId, userId), eq(savingsGoals.id, id)))
    .returning({ id: savingsGoals.id });
  return deleted.length > 0;
}

/* ---------------------------------------------------------------------------
 * Calendar (Phase 5) — scheduled events; all scoped to the session user.
 * ------------------------------------------------------------------------- */

export type CalendarEvent = typeof calendarEvents.$inferSelect;

/** Events whose local day falls within [fromDate, toDate] inclusive. */
export async function listEventsBetween(fromDate: string, toDate: string): Promise<CalendarEvent[]> {
  const userId = await requireUserId();
  return db
    .select()
    .from(calendarEvents)
    .where(and(eq(calendarEvents.userId, userId), gte(calendarEvents.date, fromDate), lte(calendarEvents.date, toDate)))
    .orderBy(asc(calendarEvents.date), asc(calendarEvents.startTime), asc(calendarEvents.createdAt));
}

export async function getCalendarEvent(id: string): Promise<CalendarEvent | null> {
  const userId = await requireUserId();
  const [row] = await db
    .select()
    .from(calendarEvents)
    .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.id, id)))
    .limit(1);
  return row ?? null;
}

export async function addCalendarEvent(input: {
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  type: CalendarEvent["type"];
  source?: CalendarEvent["source"];
  linkedWidgetId?: string | null;
}): Promise<CalendarEvent> {
  const userId = await requireUserId();
  const [row] = await db
    .insert(calendarEvents)
    .values({
      userId,
      title: input.title,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      type: input.type,
      source: input.source ?? "manual",
      linkedWidgetId: input.linkedWidgetId ?? null,
    })
    .returning();
  return row;
}

export async function updateCalendarEvent(
  id: string,
  patch: Partial<{
    title: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    type: CalendarEvent["type"];
    completed: boolean;
  }>,
): Promise<CalendarEvent | null> {
  const userId = await requireUserId();
  const [row] = await db
    .update(calendarEvents)
    .set(patch)
    .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.id, id)))
    .returning();
  return row ?? null;
}

export async function deleteCalendarEvent(id: string): Promise<boolean> {
  const userId = await requireUserId();
  const deleted = await db
    .delete(calendarEvents)
    .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.id, id)))
    .returning({ id: calendarEvents.id });
  return deleted.length > 0;
}

import "server-only";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "./index";
import { logs, profiles, widgets } from "./schema";
import type { ClientWidget } from "@/lib/widgets/types";

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

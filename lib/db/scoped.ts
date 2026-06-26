import "server-only";
import { and, eq, type SQL } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "./index";
import { profiles } from "./schema";

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

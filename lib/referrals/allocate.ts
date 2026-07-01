import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { generateReferralCode } from "./code";

/**
 * Allocate a unique referral code to a profile if it doesn't have one yet, and
 * return the code. Idempotent and race-safe: the write only fills a NULL code,
 * and unique collisions (astronomically rare) are retried.
 *
 * Deliberately imports only `db` — no `auth`/`scoped` — so the Auth.js config
 * can call it from the createUser event without an import cycle. The caller
 * supplies the (server-derived) user id.
 */
export async function ensureReferralCode(userId: string): Promise<string> {
  const [existing] = await db
    .select({ code: profiles.referralCode })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  if (existing?.code) return existing.code;

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateReferralCode();
    try {
      // Only claim the code if it's still unset (guards against a concurrent set).
      const [row] = await db
        .update(profiles)
        .set({ referralCode: code })
        .where(and(eq(profiles.userId, userId), isNull(profiles.referralCode)))
        .returning({ code: profiles.referralCode });
      if (row?.code) return row.code;

      // Someone else set it first — read and return whatever won.
      const [again] = await db
        .select({ code: profiles.referralCode })
        .from(profiles)
        .where(eq(profiles.userId, userId))
        .limit(1);
      if (again?.code) return again.code;
    } catch {
      // Unique collision on referral_code — try a fresh code.
    }
  }
  throw new Error("Could not allocate a referral code");
}

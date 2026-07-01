import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { profiles, referrals, userRewards } from "@/lib/db/schema";
import { requireUserId } from "@/lib/db/scoped";
import { ensureReferralCode } from "./allocate";
import {
  FRIEND_TRIAL_DAYS,
  MAX_REFERRAL_MILESTONES,
  REFERRALS_PER_MILESTONE,
  REFERRAL_COOKIE,
  REFERRER_REWARD_DAYS,
  normalizeCode,
  referralLink,
} from "./code";

export {
  FRIEND_TRIAL_DAYS,
  REFERRALS_PER_MILESTONE,
  REFERRAL_COOKIE,
  referralLink,
} from "./code";
export { ensureReferralCode } from "./allocate";

const DAY_MS = 86_400_000;

/**
 * Look up the user who owns a referral code. Public (unauthenticated) — used by
 * /r/[code] to validate a link before storing it. Returns only the owner's id,
 * never any profile data.
 */
export async function findReferrer(
  rawCode: string,
): Promise<{ userId: string; code: string } | null> {
  const code = normalizeCode(rawCode);
  if (!code) return null;
  const [row] = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(eq(profiles.referralCode, code))
    .limit(1);
  return row ? { userId: row.userId, code } : null;
}

/**
 * Grant `days` of Pro to a user by extending profiles.pro_until (stacking on any
 * still-active trial), and record the grant in user_rewards. Server-only helper;
 * the caller supplies a trusted, server-derived user id — never client input.
 */
export async function grantPro(
  userId: string,
  days: number,
  source: string,
): Promise<Date> {
  const now = new Date();
  const [p] = await db
    .select({ proUntil: profiles.proUntil })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  const current = p?.proUntil ?? null;
  const base = current && current.getTime() > now.getTime() ? current : now;
  const endsAt = new Date(base.getTime() + days * DAY_MS);

  await db.update(profiles).set({ proUntil: endsAt }).where(eq(profiles.userId, userId));
  await db.insert(userRewards).values({
    userId,
    rewardType: "pro",
    startsAt: now,
    endsAt,
    source,
  });
  return endsAt;
}

/**
 * Grant the referrer a Pro month for every full batch of completed referrals,
 * capped at MAX_REFERRAL_MILESTONES. Idempotent: contributing referrals are
 * flipped to 'rewarded' so they can't be counted twice.
 */
async function rewardReferrerMilestones(referrerUserId: string): Promise<void> {
  // Milestones already granted (the abuse cap and idempotency anchor).
  const [{ granted }] = await db
    .select({ granted: sql<number>`count(*)::int` })
    .from(userRewards)
    .where(
      and(eq(userRewards.userId, referrerUserId), eq(userRewards.source, "referral_milestone")),
    );
  let milestones = granted ?? 0;

  // Completed referrals not yet counted toward a milestone, oldest first.
  const pending = await db
    .select({ id: referrals.id })
    .from(referrals)
    .where(and(eq(referrals.referrerUserId, referrerUserId), eq(referrals.status, "completed")))
    .orderBy(asc(referrals.completedAt));

  let idx = 0;
  while (pending.length - idx >= REFERRALS_PER_MILESTONE && milestones < MAX_REFERRAL_MILESTONES) {
    const batch = pending.slice(idx, idx + REFERRALS_PER_MILESTONE).map((r) => r.id);
    await db.update(referrals).set({ status: "rewarded" }).where(inArray(referrals.id, batch));
    await grantPro(referrerUserId, REFERRER_REWARD_DAYS, "referral_milestone");
    idx += REFERRALS_PER_MILESTONE;
    milestones += 1;
  }
}

/**
 * Called right after the signed-in user completes onboarding. If they arrived
 * through a valid referral link (and haven't already been referred, and it isn't
 * a self-referral), attribute the referral, grant the friend's 7-day trial, and
 * top up the referrer's milestone rewards. Always clears the cookie.
 *
 * Returns the friend-reward info for the success message, or null if nothing was
 * applied. Must run in a Server Action context (it deletes the cookie).
 */
export async function completeReferralForUser(): Promise<{ trialDays: number } | null> {
  const userId = await requireUserId();
  const jar = await cookies();
  const stored = jar.get(REFERRAL_COOKIE)?.value;
  if (!stored) return null;

  const clear = () => {
    try {
      jar.delete(REFERRAL_COOKIE);
    } catch {
      /* read-only context — ignore */
    }
  };

  const referrer = await findReferrer(stored);
  // Invalid code, or self-referral → drop it silently.
  if (!referrer || referrer.userId === userId) {
    clear();
    return null;
  }

  // A user can only ever be referred once — check both the profile flag and the
  // unique referrals row (the DB unique constraint is the final backstop).
  const [me] = await db
    .select({ referredByCode: profiles.referredByCode })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  if (me?.referredByCode) {
    clear();
    return null;
  }
  const [already] = await db
    .select({ id: referrals.id })
    .from(referrals)
    .where(eq(referrals.referredUserId, userId))
    .limit(1);
  if (already) {
    clear();
    return null;
  }

  try {
    await db.insert(referrals).values({
      referrerUserId: referrer.userId,
      referredUserId: userId,
      referralCode: referrer.code,
      status: "completed",
      completedAt: new Date(),
    });
  } catch {
    // Lost a race on the unique(referred_user_id) constraint — already attributed.
    clear();
    return null;
  }

  await db.update(profiles).set({ referredByCode: referrer.code }).where(eq(profiles.userId, userId));
  await grantPro(userId, FRIEND_TRIAL_DAYS, "referred_signup");
  await rewardReferrerMilestones(referrer.userId);

  clear();
  return { trialDays: FRIEND_TRIAL_DAYS };
}

export type ReferralStats = {
  code: string;
  link: string;
  completed: number; // friends who finished onboarding (completed + rewarded)
  towardNext: number; // 0..REFERRALS_PER_MILESTONE-1 progress to the next month
  perMilestone: number;
  monthsEarned: number;
  atCap: boolean;
  proUntil: string | null; // ISO, if a temporary-Pro reward is active
};

/**
 * Referral progress for the signed-in user only. Derives the user from the
 * session (never a client-supplied id) and lazily backfills a code if missing.
 */
export async function getReferralStats(): Promise<ReferralStats> {
  const userId = await requireUserId();
  const code = await ensureReferralCode(userId);

  const rows = await db
    .select({ status: referrals.status })
    .from(referrals)
    .where(eq(referrals.referrerUserId, userId));
  const completed = rows.filter((r) => r.status === "completed" || r.status === "rewarded").length;

  const monthsEarned = Math.min(
    Math.floor(completed / REFERRALS_PER_MILESTONE),
    MAX_REFERRAL_MILESTONES,
  );
  const atCap = monthsEarned >= MAX_REFERRAL_MILESTONES;

  const [p] = await db
    .select({ proUntil: profiles.proUntil })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  const proUntil =
    p?.proUntil && p.proUntil.getTime() > Date.now() ? p.proUntil.toISOString() : null;

  return {
    code,
    link: referralLink(code),
    completed,
    towardNext: atCap ? 0 : completed % REFERRALS_PER_MILESTONE,
    perMilestone: REFERRALS_PER_MILESTONE,
    monthsEarned,
    atCap,
    proUntil,
  };
}

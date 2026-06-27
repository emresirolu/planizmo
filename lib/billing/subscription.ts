import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, subscriptions } from "@/lib/db/schema";

/**
 * Apply a Paddle subscription state to a user (webhook context — explicit
 * userId, no session). Idempotent: upserts one subscription row per user and
 * sets profiles.plan. active/trialing → pro; anything else → free.
 */
export async function applySubscription(
  userId: string,
  data: {
    paddleSubscriptionId: string | null;
    status: string;
    currentPeriodEnd: Date | null;
  },
): Promise<"free" | "pro"> {
  const plan: "free" | "pro" =
    data.status === "active" || data.status === "trialing" ? "pro" : "free";

  const values = {
    paddleSubscriptionId: data.paddleSubscriptionId,
    status: data.status,
    plan,
    currentPeriodEnd: data.currentPeriodEnd,
  };

  const [existing] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  if (existing) {
    await db.update(subscriptions).set(values).where(eq(subscriptions.id, existing.id));
  } else {
    await db.insert(subscriptions).values({ userId, ...values });
  }

  await db.update(profiles).set({ plan }).where(eq(profiles.userId, userId));
  return plan;
}

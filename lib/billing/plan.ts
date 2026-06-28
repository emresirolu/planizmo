/**
 * SINGLE SOURCE OF TRUTH for the free/Pro split + pricing.
 *
 * ⚠️ PROVISIONAL — set by Cowork so the build isn't blocked; test mode. The CEO
 * confirms/changes the split by editing THIS object only. `can()` is used both
 * server-side (enforcement, source of truth) and client-side (lock affordances).
 */

export type Plan = "free" | "pro";

export type Feature =
  | "timeline_mode"
  | "health_sync"
  | "accent"
  | "customization" // drag / resize arrange
  | "streak_freezes"
  | "unlimited_goals"
  | "unlimited_ai_planning";

export const PLAN_CONFIG = {
  free: {
    themes: ["cloud", "noir"] as string[], // only these two
    accent: false,
    timeline: false,
    healthSync: false, // manual entry still allowed
    customization: false,
    streakFreezes: false,
    maxActiveGoals: 3,
    weeklyPlansPerMonth: 2,
    planMyDayPerWeek: 3,
  },
  pro: {
    themes: "all" as const,
    accent: true,
    timeline: true,
    healthSync: true,
    customization: true,
    streakFreezes: true,
    maxActiveGoals: Infinity,
    weeklyPlansPerMonth: Infinity,
    planMyDayPerWeek: Infinity,
  },
} as const;

export const PRICING = {
  annual: { amount: "$20", period: "/yr", note: "~44% off vs $36", per: "about $1.67/mo" },
  monthly: { amount: "$3", period: "/mo", note: "billed monthly", per: "" },
} as const;

/* ---------------------------------------------------------------------------
 * Computed Pro overrides (no DB writes): a launch promo window + owner allow-list.
 * When the promo date passes, users revert to their real plan automatically.
 * ------------------------------------------------------------------------- */

/** True while now < PRO_PROMO_UNTIL (ISO date). Unset/invalid/past → false. */
export function promoActive(now: Date = new Date()): boolean {
  const until = process.env.PRO_PROMO_UNTIL;
  if (!until) return false;
  const t = Date.parse(until);
  return Number.isFinite(t) && now.getTime() < t;
}

/** OWNER_EMAILS (comma-separated) are always Pro, even after the promo ends. */
export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.OWNER_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

/** Effective plan = owner OR active promo → pro; otherwise the real plan. */
export function effectivePlan(rawPlan: Plan, email: string | null | undefined): Plan {
  if (isOwnerEmail(email)) return "pro";
  if (promoActive()) return "pro";
  return rawPlan;
}

/** Friendly promo end date for UI copy, or null. */
export function promoUntilLabel(): string | null {
  const until = process.env.PRO_PROMO_UNTIL;
  if (!until) return null;
  const t = Date.parse(until);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function can(plan: Plan, feature: Feature): boolean {
  const p = PLAN_CONFIG[plan];
  switch (feature) {
    case "timeline_mode": return p.timeline;
    case "health_sync": return p.healthSync;
    case "accent": return p.accent;
    case "customization": return p.customization;
    case "streak_freezes": return p.streakFreezes;
    case "unlimited_goals": return p.maxActiveGoals === Infinity;
    case "unlimited_ai_planning": return p.weeklyPlansPerMonth === Infinity;
  }
}

export function themeAllowed(plan: Plan, themeId: string): boolean {
  const t = PLAN_CONFIG[plan].themes;
  return t === "all" || (t as string[]).includes(themeId);
}

export const LIMITS = {
  weeklyPlansPerMonth: PLAN_CONFIG.free.weeklyPlansPerMonth,
  planMyDayPerWeek: PLAN_CONFIG.free.planMyDayPerWeek,
  maxActiveGoals: PLAN_CONFIG.free.maxActiveGoals,
};

/** Calm, non-nagging upgrade copy per gated reason. */
export const UPGRADE_COPY: Record<string, string> = {
  timeline_mode: "Timeline view is part of Pro.",
  health_sync: "Automatic health sync is part of Pro — you can still log sleep & steps by hand.",
  accent: "Custom accent colors are part of Pro.",
  customization: "Drag-and-resize customization is part of Pro.",
  theme: "That theme is part of Pro. Cloud and Noir are always free.",
  goals: "Free includes up to 3 goals. Upgrade for unlimited.",
  weekly_plan: "You've used your free weekly plans this month. Upgrade for unlimited planning.",
  plan_my_day: "You've used your free plan-my-day runs this week. Upgrade for unlimited.",
  replan: "Replanning around an anchor is part of Pro.",
  next_move: "Recommended next move is part of Pro.",
};

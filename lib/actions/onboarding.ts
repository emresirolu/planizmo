"use server";

import { revalidatePath } from "next/cache";
import {
  addCalendarEvent,
  addGoal,
  addWidget,
  completeOnboarding,
  getMyTimezone,
  listMyWidgets,
} from "@/lib/db/scoped";
import { todayInTimeZone } from "@/lib/widgets/date";
import { planFromAnswers, type OnboardingAnswers } from "@/lib/onboarding/generate";
import { completeReferralForUser } from "@/lib/referrals";

export async function generateDaybookAction(
  answers: OnboardingAnswers,
): Promise<
  | { ok: true; goals: string[]; trackers: string[]; metrics: string[]; referralTrialDays: number | null }
  | { ok: false; error: string }
> {
  const safe: OnboardingAnswers = {
    areas: Array.isArray(answers.areas) ? answers.areas.slice(0, 12) : [],
    goals: Array.isArray(answers.goals) ? answers.goals.slice(0, 3) : [],
    routine: typeof answers.routine === "string" ? answers.routine.slice(0, 1000) : "",
    energy: typeof answers.energy === "string" ? answers.energy : "Depends",
    coaching: typeof answers.coaching === "string" ? answers.coaching : "Direct",
  };

  try {
    const plan = planFromAnswers(safe);

    // Idempotent: skip trackers/goals whose title already exists.
    const existing = await listMyWidgets();
    const haveTitles = new Set(existing.map((w) => w.title.toLowerCase()));

    for (const g of plan.goals) await addGoal({ title: g.slice(0, 100) });

    for (const t of plan.trackers) {
      if (haveTitles.has(t.title.toLowerCase())) continue;
      await addWidget({ type: t.type, title: t.title, icon: t.icon, schedule: t.schedule, target: t.target, unit: t.unit, size: "1x1" });
    }

    const today = todayInTimeZone(await getMyTimezone());
    for (const b of plan.blocks) {
      await addCalendarEvent({ title: b.title, date: today, startTime: b.startTime, endTime: null, type: b.type, source: "ai" });
    }

    await completeOnboarding(safe.energy, safe.coaching);

    // If they arrived through a referral link, attribute it and grant the trial.
    // Never let a referral hiccup fail onboarding — the daybook is already built.
    let referralTrialDays: number | null = null;
    try {
      const reward = await completeReferralForUser();
      referralTrialDays = reward?.trialDays ?? null;
    } catch {
      referralTrialDays = null;
    }

    revalidatePath("/dashboard");

    return {
      ok: true,
      goals: plan.goals,
      trackers: plan.trackers.map((t) => t.title),
      metrics: plan.metrics,
      referralTrialDays,
    };
  } catch {
    return { ok: false, error: "Couldn't build your daybook — try again." };
  }
}

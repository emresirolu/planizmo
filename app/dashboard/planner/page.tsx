import { redirect } from "next/navigation";
import { auth } from "@/auth";
import WeekPlanner from "@/components/WeekPlanner";
import { getMyProfile, getWeekPlan } from "@/lib/db/scoped";
import { todayInTimeZone } from "@/lib/widgets/date";
import { addDays, mondayOf } from "@/lib/widgets/streak";
import { WEEKDAYS } from "@/lib/plan/context";
import type { WeekPlan } from "@/lib/plan/types";

function rangeLabel(weekStart: string): string {
  const end = addDays(weekStart, 6);
  const f = (d: string) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  return `${f(weekStart)} – ${f(end)}`;
}

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const profile = await getMyProfile();
  const tz = profile?.timezone || "UTC";
  const sp = await searchParams;
  const base =
    sp.week && /^\d{4}-\d{2}-\d{2}$/.test(sp.week) ? sp.week : todayInTimeZone(tz);
  const weekStart = mondayOf(base);

  const row = await getWeekPlan(weekStart);
  const initialPlan = (row?.planJson as WeekPlan | null) ?? null;

  const days = Array.from({ length: 7 }, (_, i) => ({
    date: addDays(weekStart, i),
    weekday: WEEKDAYS[i],
  }));

  return (
    <WeekPlanner
      weekStart={weekStart}
      days={days}
      rangeLabel={rangeLabel(weekStart)}
      prevWeek={addDays(weekStart, -7)}
      nextWeek={addDays(weekStart, 7)}
      initialPlan={initialPlan}
      initialStatus={(row?.status as "draft" | "approved" | undefined) ?? null}
      initialBrainDump={row?.brainDumpText ?? ""}
    />
  );
}

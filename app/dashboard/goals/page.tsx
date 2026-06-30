import { redirect } from "next/navigation";
import { auth } from "@/auth";
import GoalsBoard from "@/components/GoalsBoard";
import { getLogsSince, getMyProfile, listGoals, listMyWidgets, toClientGoal } from "@/lib/db/scoped";
import { todayInTimeZone } from "@/lib/widgets/date";
import { addDays, mondayOf } from "@/lib/widgets/streak";
import type { TrendPoint } from "@/components/TrendChart";

const WEEKS = 8;
function expectedPerWeek(schedule: string, target: number | null): number {
  if (schedule === "weekdays") return 5;
  if (schedule === "times_per_week") return Math.max(1, target ?? 1);
  return 7;
}

export default async function GoalsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const profile = await getMyProfile();
  const tz = profile?.timezone || "UTC";
  const today = todayInTimeZone(tz);

  const goalRows = await listGoals();
  const goals = goalRows.map(toClientGoal);

  // Linkable trackers (for the per-goal dropdown).
  const allWidgets = await listMyWidgets();
  const linkable = allWidgets.filter((w) => ["habit", "counter", "health", "reading"].includes(w.type));
  const widgets = linkable.map((w) => ({ id: w.id, title: w.title }));

  // Weekly completion % over the last 8 weeks, for any widget a goal links to.
  const linkedIds = new Set(goalRows.map((g) => g.linkedWidgetId).filter((x): x is string => Boolean(x)));
  const linkedSeries: Record<string, TrendPoint[]> = {};
  if (linkedIds.size > 0) {
    const firstWeek = mondayOf(addDays(today, -7 * (WEEKS - 1)));
    const logs = await getLogsSince(firstWeek);
    for (const w of allWidgets) {
      if (!linkedIds.has(w.id)) continue;
      const expected = expectedPerWeek(w.schedule, w.target ?? null);
      const points: TrendPoint[] = [];
      for (let k = WEEKS - 1; k >= 0; k--) {
        const ws = mondayOf(addDays(today, -7 * k));
        const we = addDays(ws, 6);
        const done = logs.filter((l) => l.widgetId === w.id && l.completed && l.date >= ws && l.date <= we).length;
        points.push({ date: ws, value: Math.min(100, Math.round((done / expected) * 100)) });
      }
      linkedSeries[w.id] = points;
    }
  }

  return (
    <div className="px-6 py-7 md:px-8">
      <GoalsBoard initial={goals} widgets={widgets} linkedSeries={linkedSeries} />
    </div>
  );
}

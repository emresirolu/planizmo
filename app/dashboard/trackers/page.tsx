import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Dashboard from "@/components/Dashboard";
import TrackerTrends, { type TrackerSeries } from "@/components/TrackerTrends";
import { getLogsSince, getMyPlan, getMyProfile, listMyWidgets } from "@/lib/db/scoped";
import { loadDashboard } from "@/lib/widgets/dashboard-data";
import { todayInTimeZone } from "@/lib/widgets/date";
import { addDays } from "@/lib/widgets/streak";
import type { Direction } from "@/lib/gym/types";

/** "More is better" unless it's a thing you want less of (screen time, etc.). */
function directionFor(title: string, unit: string | null, hasTarget: boolean): Direction {
  const t = `${title} ${unit ?? ""}`.toLowerCase();
  if (/screen|scroll|spend|sugar|smok|alcohol|weight loss/.test(t)) return "down";
  return hasTarget ? "up" : "neutral";
}

export default async function TrackersPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const profile = await getMyProfile();
  const data = await loadDashboard();
  const plan = await getMyPlan();
  const name = profile?.displayName?.split(" ")[0] ?? session.user.name?.split(" ")[0] ?? "there";

  // Per-tracker 60-day series for the Trends section (numeric trackers only).
  const tz = profile?.timezone || "UTC";
  const since = addDays(todayInTimeZone(tz), -60);
  const [widgets, logs] = await Promise.all([listMyWidgets(), getLogsSince(since)]);
  const numeric = widgets.filter((w) => ["counter", "health", "reading", "mood"].includes(w.type));
  const series: TrackerSeries[] = numeric
    .map((w) => {
      const points = logs
        .filter((l) => l.widgetId === w.id && l.value != null)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((l) => ({ date: l.date, value: Number(l.value) }));
      return {
        id: w.id,
        title: w.title,
        unit: w.unit ?? "",
        direction: w.type === "mood" ? ("up" as Direction) : directionFor(w.title, w.unit, w.target != null),
        points,
      };
    })
    .filter((s) => s.points.length > 0);

  return (
    <div>
      <Dashboard
        heading="Trackers"
        plan={plan}
        filterKinds={["habit", "counter", "health", "reading", "mood"]}
        name={name}
        greeting=""
        dateStr=""
        today={data.today}
        profileTimezone={data.tz}
        initialWidgets={data.widgets}
        initialLogs={data.logs}
        initialStreaks={data.streaks}
        initialHeatmaps={data.heatmaps}
        initialChecklists={data.checklists}
        initialTasks={data.tasks}
      />
      <div className="mx-auto max-w-5xl">
        <TrackerTrends series={series} />
      </div>
    </div>
  );
}

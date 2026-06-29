import { redirect } from "next/navigation";
import { auth } from "@/auth";
import TodayHome, { type ChecklistRow, type LaterItem, type MainMove } from "@/components/TodayHome";
import { getLogsSince, getMyProfile, listEventsBetween } from "@/lib/db/scoped";
import { loadDashboard } from "@/lib/widgets/dashboard-data";
import { isScheduledToday } from "@/lib/widgets/logic";
import { mondayOf } from "@/lib/widgets/streak";

const GYMISH = /gym|workout|train|lift|exercise/i;
const ROW_KINDS = ["habit", "counter", "health", "reading", "checklist"] as const;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const profile = await getMyProfile();
  const tz = profile?.timezone || "UTC";
  const data = await loadDashboard();

  const dateLabel = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "short", day: "numeric" }).format(new Date());
  const asOf = new Date(`${data.today}T00:00:00Z`);

  // This-week completion counts (for times_per_week trackers like "gym 5×/week").
  const weekStart = mondayOf(data.today);
  const weekLogs = await getLogsSince(weekStart);
  const weekCount: Record<string, number> = {};
  for (const l of weekLogs) {
    if (l.completed && l.date >= weekStart && l.date <= data.today) weekCount[l.widgetId] = (weekCount[l.widgetId] ?? 0) + 1;
  }

  const rows: ChecklistRow[] = [];
  for (const w of data.widgets) {
    if (!ROW_KINDS.includes(w.type as (typeof ROW_KINDS)[number])) continue;
    if (!isScheduledToday(w.schedule, asOf)) continue;
    const log = data.logs[w.id];

    if (w.type === "checklist") {
      const cl = data.checklists[w.id];
      const total = cl?.items.length ?? 0;
      const done = cl?.checkedToday.length ?? 0;
      rows.push({ widgetId: w.id, title: w.title, type: "checklist", current: done, target: Math.max(1, total), unit: null, completed: total > 0 && done >= total });
    } else if (w.schedule === "times_per_week") {
      const target = w.target ?? 1;
      const current = weekCount[w.id] ?? 0;
      rows.push({ widgetId: w.id, title: w.title, type: w.type as ChecklistRow["type"], current, target, unit: null, completed: current >= target });
    } else if (w.target != null && (w.type === "counter" || w.type === "health" || w.type === "reading")) {
      const current = log?.value ?? 0;
      rows.push({ widgetId: w.id, title: w.title, type: w.type as ChecklistRow["type"], current, target: w.target, unit: w.unit, completed: log?.completed ?? current >= w.target });
    } else {
      const completed = log?.completed ?? false;
      rows.push({ widgetId: w.id, title: w.title, type: w.type as ChecklistRow["type"], current: completed ? 1 : 0, target: 1, unit: null, completed });
    }
  }

  // Main move: the next thing to do — prefer a gym/workout item, else the first incomplete.
  const incomplete = rows.filter((r) => !r.completed && r.type !== "checklist");
  const moveRow = incomplete.find((r) => GYMISH.test(r.title)) ?? incomplete[0] ?? null;
  const mainMove: MainMove = moveRow
    ? { title: moveRow.title, href: GYMISH.test(moveRow.title) ? "/dashboard/gym" : "/dashboard/trackers" }
    : null;

  const note = "A clear next step keeps your momentum going — knock this out while you're fresh.";

  const eventRows = await listEventsBetween(data.today, data.today);
  const later: LaterItem[] = eventRows
    .filter((e) => !e.completed)
    .map((e) => ({ id: e.id, title: e.title, startTime: e.startTime ? e.startTime.slice(0, 5) : null }));

  return <TodayHome dateLabel={dateLabel} mainMove={mainMove} note={note} rows={rows} later={later} today={data.today} />;
}

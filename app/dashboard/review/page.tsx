import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ReviewBoard, { type ReviewData } from "@/components/daybook/ReviewBoard";
import { getLogsSince, getMyProfile, listGoals, listMyWidgets, listRecentWorkouts } from "@/lib/db/scoped";
import { todayInTimeZone } from "@/lib/widgets/date";
import { addDays, mondayOf } from "@/lib/widgets/streak";

const TRACKER_KINDS = ["habit", "counter", "health", "reading"];
const WEEKS = 6;

export default async function ReviewPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const profile = await getMyProfile();
  const tz = profile?.timezone || "UTC";
  const today = todayInTimeZone(tz);
  const firstWeek = mondayOf(addDays(today, -7 * (WEEKS - 1)));

  const [widgets, logs, workouts, goals] = await Promise.all([
    listMyWidgets(),
    getLogsSince(firstWeek),
    listRecentWorkouts(60),
    listGoals(),
  ]);

  const trackers = widgets.filter((w) => TRACKER_KINDS.includes(w.type));
  const sleepW = widgets.find((w) => /sleep/i.test(w.title) || w.unit === "hours");
  const numTrackers = Math.max(1, trackers.length);

  // weekly buckets (oldest -> newest)
  const weekStarts = Array.from({ length: WEEKS }, (_, i) => mondayOf(addDays(today, -7 * (WEEKS - 1 - i))));
  const label = (ws: string) => { const [, m, d] = ws.split("-"); return `${Number(m)}/${Number(d)}`; };

  const completedInWeek = (ws: string) => {
    const we = addDays(ws, 6);
    const seen = new Set<string>();
    for (const l of logs) if (l.completed && l.date >= ws && l.date <= we) seen.add(`${l.widgetId}|${l.date}`);
    return seen.size;
  };
  const workoutsInWeek = (ws: string) => { const we = addDays(ws, 6); return workouts.filter((w) => w.date >= ws && w.date <= we).length; };

  const consistency = weekStarts.map((ws) => ({ week: label(ws), value: Math.min(100, Math.round((completedInWeek(ws) / (numTrackers * 7)) * 100)) }));
  const workoutSeries = weekStarts.map((ws) => ({ week: label(ws), value: workoutsInWeek(ws) }));

  const thisWeek = weekStarts[WEEKS - 1];
  const prevWeek = weekStarts[WEEKS - 2];
  const consistencyNow = consistency[WEEKS - 1].value;
  const workoutsNow = workoutSeries[WEEKS - 1].value;

  // sleep average this week
  const sleepVals = sleepW
    ? logs.filter((l) => l.widgetId === sleepW.id && l.date >= thisWeek && l.value != null).map((l) => Number(l.value))
    : [];
  const sleepAvg = sleepVals.length ? Math.round((sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length) * 10) / 10 : null;

  const activeGoals = goals.filter((g) => g.status === "active");
  const goalAvg = activeGoals.length ? Math.round(activeGoals.reduce((a, g) => a + g.progressPct, 0) / activeGoals.length) : 0;

  const trackerCompletion = Math.min(100, Math.round((completedInWeek(thisWeek) / (numTrackers * 7)) * 100));

  const hasData = logs.length > 0 || workouts.length > 0 || activeGoals.length > 0;

  const data: ReviewData = {
    hasData,
    scorecards: [
      { label: "CONSISTENCY", value: `${consistencyNow}%`, sub: "scheduled done" },
      { label: "WORKOUTS", value: String(workoutsNow), sub: "this week" },
      { label: "SLEEP AVG", value: sleepAvg != null ? `${sleepAvg}h` : "—", sub: "per night" },
      { label: "TRACKERS", value: `${trackerCompletion}%`, sub: "completion" },
      { label: "GOALS", value: `${goalAvg}%`, sub: "avg progress" },
    ],
    consistency,
    workouts: workoutSeries,
    metrics: {
      consistency: consistencyNow,
      consistencyPrev: consistency[WEEKS - 2]?.value ?? 0,
      workouts: workoutsNow,
      workoutsPrev: workoutsInWeek(prevWeek),
      sleepAvg: sleepAvg ?? 0,
      trackerCompletion,
      goalProgress: goalAvg,
    },
  };

  return <ReviewBoard data={data} />;
}

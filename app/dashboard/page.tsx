import { redirect } from "next/navigation";
import { auth } from "@/auth";
import TodayView from "@/components/TodayView";
import { getHealthSummary, getMyPlan, getMyProfile, getMyViewMode, listGoals, listTimeBlocks, toClientGoal } from "@/lib/db/scoped";
import { loadDashboard } from "@/lib/widgets/dashboard-data";
import { isScheduledToday } from "@/lib/widgets/logic";
import { isCategory, type Category } from "@/lib/plan/categories";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const profile = await getMyProfile();
  const tz = profile?.timezone || "UTC";
  const data = await loadDashboard();
  const viewMode = await getMyViewMode();
  const health = await getHealthSummary();
  const goals = (await listGoals()).map(toClientGoal);
  const plan = await getMyPlan();
  const blockRows = await listTimeBlocks(data.today);
  const timeBlocks = blockRows.map((b) => ({
    id: b.id,
    startTime: b.startTime.slice(0, 5),
    durationMin: b.durationMin,
    title: b.title,
    category: (isCategory(b.category) ? b.category : "focus") as Category,
    completed: b.completed,
  }));

  const name = profile?.displayName?.split(" ")[0] ?? session.user.name?.split(" ")[0] ?? "there";
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(new Date()));
  const greeting = greetingForHour(hour);

  const asOf = new Date(`${data.today}T00:00:00Z`);
  const trackable = data.widgets.filter(
    (w) => ["habit", "counter", "health", "reading", "mood"].includes(w.type) && isScheduledToday(w.schedule, asOf),
  );
  const checklistCount = data.widgets.filter((w) => w.type === "checklist" && isScheduledToday(w.schedule, asOf)).length;
  const tasks = Object.entries(data.tasks).flatMap(([wid, arr]) =>
    arr.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate, completed: t.completed, widgetId: wid })),
  );
  const dueToday = tasks.filter((t) => !t.completed && t.dueDate === data.today).length;
  const scheduled = trackable.length + checklistCount + dueToday;
  const done = trackable.filter((w) => data.logs[w.id]?.completed).length;

  const summary =
    scheduled === 0
      ? "Your day is open — add a habit or ask the assistant to plan it."
      : `You've got ${scheduled} thing${scheduled === 1 ? "" : "s"} on today${done > 0 ? `, ${done} already done` : ""}. Tap an item to log it, or ask the assistant to lay out your day.`;

  return (
    <TodayView
      name={name}
      greeting={greeting}
      summary={summary}
      today={data.today}
      widgets={data.widgets}
      initialLogs={data.logs}
      streaks={data.streaks}
      checklists={data.checklists}
      tasks={tasks}
      initialViewMode={viewMode}
      timeBlocks={timeBlocks}
      health={health}
      goals={goals}
      plan={plan}
    />
  );
}

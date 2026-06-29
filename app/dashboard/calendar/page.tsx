import { redirect } from "next/navigation";
import { auth } from "@/auth";
import CalendarTab from "@/components/CalendarTab";
import {
  getLogsSince,
  getMyProfile,
  listEventsBetween,
  listMyWidgets,
} from "@/lib/db/scoped";
import { todayInTimeZone } from "@/lib/widgets/date";
import { addDays, mondayOf } from "@/lib/widgets/streak";
import type { ClientEvent } from "@/lib/calendar/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
type View = "month" | "week" | "day";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; d?: string; week?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const profile = await getMyProfile();
  const tz = profile?.timezone || "UTC";
  const today = todayInTimeZone(tz);

  const sp = await searchParams;
  const focus = sp.d && DATE_RE.test(sp.d) ? sp.d : sp.week && DATE_RE.test(sp.week) ? sp.week : today;
  const view: View = sp.v === "month" || sp.v === "day" ? sp.v : "week";

  // Load a 6-week window around the focus month — covers month/week/day views.
  const firstOfMonth = `${focus.slice(0, 7)}-01`;
  const gridStart = mondayOf(firstOfMonth);
  const gridEnd = addDays(gridStart, 41);

  const [eventRows, widgets] = await Promise.all([listEventsBetween(gridStart, gridEnd), listMyWidgets()]);

  const events: ClientEvent[] = eventRows.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    startTime: e.startTime ? e.startTime.slice(0, 5) : null,
    endTime: e.endTime ? e.endTime.slice(0, 5) : null,
    type: e.type,
    source: e.source,
    completed: e.completed,
    linkedWidgetId: e.linkedWidgetId,
  }));

  const habitWidgets = widgets.filter((w) => w.type === "habit");
  const habits = habitWidgets.map((w) => ({ id: w.id, title: w.title, schedule: w.schedule }));
  const habitIds = new Set(habitWidgets.map((w) => w.id));

  const logs = await getLogsSince(gridStart);
  const completedHabitKeys = logs
    .filter((l) => l.completed && l.date <= gridEnd && habitIds.has(l.widgetId))
    .map((l) => `${l.widgetId}|${l.date}`);

  return (
    <CalendarTab
      events={events}
      habits={habits}
      completedHabitKeys={completedHabitKeys}
      today={today}
      focus={focus}
      view={view}
    />
  );
}

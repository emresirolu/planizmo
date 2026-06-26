import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Dashboard from "@/components/Dashboard";
import {
  getMyProfile,
  getTodayLogs,
  listMyWidgets,
  toClientWidget,
} from "@/lib/db/scoped";
import { todayInTimeZone } from "@/lib/widgets/date";
import type { LogState } from "@/lib/widgets/types";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const profile = await getMyProfile();
  const tz = profile?.timezone || "UTC";
  const today = todayInTimeZone(tz);

  const [widgetRows, todaysLogs] = await Promise.all([
    listMyWidgets(),
    getTodayLogs(today),
  ]);

  const widgets = widgetRows.map(toClientWidget);
  const logs: Record<string, LogState> = {};
  for (const l of todaysLogs) {
    logs[l.widgetId] = {
      value: l.value != null ? Number(l.value) : null,
      completed: l.completed,
    };
  }

  const name =
    profile?.displayName?.split(" ")[0] ??
    session?.user?.name?.split(" ")[0] ??
    "there";

  // Greeting/date reflect the user's local day.
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).format(now),
  );
  const dateStr = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(now);

  return (
    <Dashboard
      name={name}
      greeting={greetingForHour(hour)}
      dateStr={dateStr}
      profileTimezone={tz}
      initialWidgets={widgets}
      initialLogs={logs}
    />
  );
}

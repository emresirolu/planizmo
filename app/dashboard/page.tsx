import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Dashboard from "@/components/Dashboard";
import { getMyProfile } from "@/lib/db/scoped";
import { loadDashboard } from "@/lib/widgets/dashboard-data";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const profile = await getMyProfile();
  const data = await loadDashboard();
  const tz = data.tz;

  const name =
    profile?.displayName?.split(" ")[0] ??
    session?.user?.name?.split(" ")[0] ??
    "there";

  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(now),
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
      today={data.today}
      profileTimezone={tz}
      initialWidgets={data.widgets}
      initialLogs={data.logs}
      initialStreaks={data.streaks}
      initialHeatmaps={data.heatmaps}
      initialChecklists={data.checklists}
      initialTasks={data.tasks}
    />
  );
}

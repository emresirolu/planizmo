import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Dashboard from "@/components/Dashboard";
import { getMyPlan, getMyProfile } from "@/lib/db/scoped";
import { loadDashboard } from "@/lib/widgets/dashboard-data";

export default async function HabitsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const profile = await getMyProfile();
  const data = await loadDashboard();
  const plan = await getMyPlan();
  const name = profile?.displayName?.split(" ")[0] ?? session.user.name?.split(" ")[0] ?? "there";

  return (
    <Dashboard
      heading="Habits"
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
  );
}

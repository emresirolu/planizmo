import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Dashboard from "@/components/Dashboard";
import { getMyProfile } from "@/lib/db/scoped";
import { loadDashboard } from "@/lib/widgets/dashboard-data";

export default async function ListsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const profile = await getMyProfile();
  const data = await loadDashboard();
  const name = profile?.displayName?.split(" ")[0] ?? session.user.name?.split(" ")[0] ?? "there";

  return (
    <Dashboard
      heading="Lists"
      filterKinds={["checklist", "tasks"]}
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

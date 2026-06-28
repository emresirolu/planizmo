import { redirect } from "next/navigation";

// Planner has been folded into Calendar in v2.
export default async function PlannerRedirect({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const sp = await searchParams;
  redirect(sp.week ? `/dashboard/calendar?week=${sp.week}` : "/dashboard/calendar");
}

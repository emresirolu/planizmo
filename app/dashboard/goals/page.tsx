import { redirect } from "next/navigation";
import { auth } from "@/auth";
import GoalsBoard from "@/components/GoalsBoard";
import { listGoals, toClientGoal } from "@/lib/db/scoped";

export default async function GoalsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const goals = (await listGoals()).map(toClientGoal);
  return <GoalsBoard initial={goals} />;
}

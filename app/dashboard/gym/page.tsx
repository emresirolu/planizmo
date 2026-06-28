import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ComingSoonPage from "@/components/ComingSoonPage";

export default async function GymPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return (
    <ComingSoonPage
      title="Gym"
      milestone="phase 3"
      blurb="Your training home — body metrics over time, workout history, and an AI coach that suggests your next session. Log it all just by telling the AI operator what you did."
    />
  );
}

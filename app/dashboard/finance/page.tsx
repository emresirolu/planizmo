import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ComingSoonPage from "@/components/ComingSoonPage";

export default async function FinancePage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return (
    <ComingSoonPage
      title="Finance"
      milestone="phase 4"
      blurb="A calm view of your money — income, expenses, spending categories, recurring subscriptions, and a savings goal with progress. Plus an AI insight card that tells you what's changing."
    />
  );
}

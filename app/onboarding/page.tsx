import { redirect } from "next/navigation";
import { auth } from "@/auth";
import OnboardingFlow from "@/components/daybook/OnboardingFlow";
import { getMyProfile } from "@/lib/db/scoped";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const profile = await getMyProfile();
  if (profile?.onboardedAt) redirect("/dashboard");
  return <OnboardingFlow />;
}

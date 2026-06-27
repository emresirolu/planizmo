import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Paywall from "@/components/Paywall";
import { getMyPlan } from "@/lib/db/scoped";
import { checkoutEnabled, paddleConfig } from "@/lib/billing/paddle";

export default async function UpgradePage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const cfg = paddleConfig();
  const plan = await getMyPlan();

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-[28px] font-medium tracking-tight">Planizmo Pro</h1>
      <p className="mb-5 text-[13px]" style={{ color: "var(--muted)" }}>
        Free keeps your tracking, streaks and the AI rail forever. Pro adds the planning superpowers.
      </p>
      <Paywall
        userId={session.user.id}
        currentPlan={plan}
        config={{
          enabled: checkoutEnabled(),
          clientToken: cfg.clientToken,
          environment: cfg.environment,
          priceMonthly: cfg.priceMonthly,
          priceAnnual: cfg.priceAnnual,
        }}
      />
    </div>
  );
}

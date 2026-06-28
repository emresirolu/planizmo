import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Paywall from "@/components/Paywall";
import { getPlanContext } from "@/lib/db/scoped";
import { checkoutEnabled, paddleConfig } from "@/lib/billing/paddle";

export default async function UpgradePage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const cfg = paddleConfig();
  const ctx = await getPlanContext();
  const realPro = ctx.raw === "pro" || ctx.owner; // promo Pro is not "real" Pro

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-[28px] font-medium tracking-tight">Planizmo Pro</h1>
      <p className="mb-5 text-[13px]" style={{ color: "var(--muted)" }}>
        {ctx.promo && !realPro
          ? `You have Pro free during launch${ctx.promoUntil ? ` (until ${ctx.promoUntil})` : ""}. Lock it in to keep it after.`
          : "Free keeps your tracking, streaks and the AI rail forever. Pro adds the planning superpowers."}
      </p>
      <Paywall
        userId={session.user.id}
        realPro={realPro}
        promo={ctx.promo}
        promoUntil={ctx.promoUntil}
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

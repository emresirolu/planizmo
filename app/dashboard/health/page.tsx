import { redirect } from "next/navigation";
import { auth } from "@/auth";
import HealthSummary from "@/components/HealthSummary";
import { getHealthSummary } from "@/lib/db/scoped";

export default async function HealthPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const health = await getHealthSummary();
  const fitbitEnabled = process.env.HEALTH_PROVIDER === "fitbit";

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-[28px] font-medium tracking-tight">Health</h1>
      <p className="mb-5 text-[14px] leading-relaxed" style={{ color: "var(--muted)" }}>
        Sleep and steps sync in automatically; your workout count comes from your gym habit. These numbers feed your daily summary and weekly plan.
      </p>

      <HealthSummary summary={health} />

      <div className="mt-4 rounded-[18px] border p-[18px]" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[15px] font-semibold tracking-tight">Connected sources</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: "var(--surface2)", color: "var(--text)" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
            </span>
            <span className="text-sm">Fitbit</span>
          </div>
          {fitbitEnabled ? (
            <a href="/api/integrations/fitbit/connect" className="rounded-full border px-3.5 py-1.5 text-[13px] font-medium" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>Connect</a>
          ) : (
            <span className="text-[12.5px]" style={{ color: "var(--muted)" }}>using sample data</span>
          )}
        </div>
        <p className="mt-1 text-[12px]" style={{ color: "var(--muted)" }}>
          Real Fitbit / Google Health sync activates when HEALTH_PROVIDER=fitbit and credentials are set. Until then Planizmo uses stable sample data so the experience is complete.
        </p>
      </div>
    </div>
  );
}

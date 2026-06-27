"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Summary = {
  sleepHours: number | null;
  sleepTarget: number;
  steps: number | null;
  stepsTarget: number;
  workout: { title: string; done: number; target: number | null } | null;
  provider: "mock" | "fitbit";
};

function fmtSleep(h: number): string {
  const H = Math.floor(h);
  const M = Math.round((h - H) * 60);
  return `${H}h ${M}m`;
}
const pct = (v: number, t: number) => Math.min(100, Math.round((v / t) * 100));

function Metric({ icon, label, value, goal, fill }: { icon: React.ReactNode; label: string; value: string; goal: string; fill: number }) {
  return (
    <div>
      <div className="flex items-center gap-2" style={{ color: "var(--muted)" }}>
        {icon}
        <span className="text-[12.5px]">{label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-[17px] font-medium">{value}</span>
        <span className="text-[11.5px]" style={{ color: "var(--muted)" }}>{goal}</span>
      </div>
      <div className="mt-1.5 h-[5px] overflow-hidden rounded-full" style={{ background: "var(--surface2)" }}>
        <div className="h-full rounded-full" style={{ width: `${fill}%`, background: "var(--success)" }} />
      </div>
    </div>
  );
}

const I = {
  moon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z" /></svg>,
  steps: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
  gym: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16M6.5 8.5v7M3.5 10v4M17.5 8.5v7M20.5 10v4" /></svg>,
};

export default function HealthSummary({ summary, compact }: { summary: Summary; compact?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const hasData = summary.sleepHours != null || summary.steps != null;

  function syncNow() {
    setErr(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/health-sync", { method: "POST" });
        if (res.ok) {
          router.refresh();
        } else {
          const d = await res.json().catch(() => ({}));
          setErr(d.upgrade ? "Auto-sync is a Pro feature — upgrade to connect." : "Sync failed — try again.");
        }
      } catch {
        setErr("Couldn't reach sync.");
      }
    });
  }

  return (
    <section className="rounded-[18px] border p-[18px]" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="mb-3.5 flex items-center justify-between">
        <span className={`${compact ? "text-[14.5px]" : "text-[15px]"} font-semibold tracking-tight`}>Health summary</span>
        <button type="button" onClick={syncNow} disabled={pending} className="text-[12.5px] font-medium disabled:opacity-60" style={{ color: "var(--accent)", cursor: "pointer" }}>
          {pending ? "Syncing…" : "Sync now"}
        </button>
      </div>

      {!hasData ? (
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--muted)" }}>
          No health data yet. {summary.provider === "fitbit" ? "Connect Fitbit and " : ""}tap “Sync now” to pull in sleep and steps.
        </p>
      ) : (
        <div className="flex flex-col gap-[15px]">
          {summary.sleepHours != null && (
            <Metric icon={I.moon} label="Sleep" value={fmtSleep(summary.sleepHours)} goal={`goal ${summary.sleepTarget}h`} fill={pct(summary.sleepHours, summary.sleepTarget)} />
          )}
          {summary.steps != null && (
            <Metric icon={I.steps} label="Steps" value={summary.steps.toLocaleString("en-US")} goal={`goal ${summary.stepsTarget.toLocaleString("en-US")}`} fill={pct(summary.steps, summary.stepsTarget)} />
          )}
          {summary.workout && (
            <Metric
              icon={I.gym}
              label={summary.workout.title}
              value={summary.workout.target ? `${summary.workout.done} / ${summary.workout.target}` : String(summary.workout.done)}
              goal="this week"
              fill={summary.workout.target ? pct(summary.workout.done, summary.workout.target) : summary.workout.done > 0 ? 100 : 0}
            />
          )}
        </div>
      )}

      <div className="mt-3 text-[11px]" style={{ color: "var(--muted)" }}>
        {summary.provider === "fitbit" ? "Synced from Fitbit" : "Sample data (mock provider)"}
        {err && <span style={{ color: "var(--alert)" }}> · {err}</span>}
      </div>
    </section>
  );
}

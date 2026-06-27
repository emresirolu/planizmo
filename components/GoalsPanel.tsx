import Link from "next/link";
import WidgetIcon from "./WidgetIcon";
import type { ClientGoal } from "@/lib/goals/types";

/** Read-only Goals panel for the dashboard (matches the mockup). */
export default function GoalsPanel({ goals }: { goals: ClientGoal[] }) {
  const active = goals.filter((g) => g.status === "active").slice(0, 4);

  return (
    <section className="rounded-[18px] border p-[18px]" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[15px] font-semibold tracking-tight">Goals</span>
        <Link href="/dashboard/goals" className="text-[13px] font-medium" style={{ color: "var(--accent)" }}>View all</Link>
      </div>

      {active.length === 0 ? (
        <p className="py-2 text-[13px] leading-relaxed" style={{ color: "var(--muted)" }}>
          No goals yet. <Link href="/dashboard/goals" style={{ color: "var(--accent)" }}>Set one</Link> and Planizmo will tie your weeks back to it.
        </p>
      ) : (
        active.map((g, i) => (
          <div key={g.id} className="flex gap-3 py-3" style={i < active.length - 1 ? { borderBottom: "1px solid var(--border)" } : undefined}>
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px]" style={{ background: "var(--surface2)", color: "var(--text)" }}>
              <WidgetIcon name={g.icon} size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{g.title}</span>
                <span className="flex-none text-[13px]" style={{ color: "var(--muted)" }}>{g.progressPct}%</span>
              </div>
              {g.nextStep && (
                <div className="mt-0.5 truncate text-[12.5px]" style={{ color: "var(--muted)" }}>Next: {g.nextStep}</div>
              )}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface2)" }}>
                <div className="h-full rounded-full" style={{ width: `${g.progressPct}%`, background: "var(--accent)" }} />
              </div>
            </div>
          </div>
        ))
      )}
    </section>
  );
}

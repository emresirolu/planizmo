"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import OperatorBar from "@/components/OperatorBar";
import { logWidget } from "@/lib/actions/widgets";
import { fmtTime } from "@/lib/calendar/types";

export type ChecklistRow = {
  widgetId: string;
  title: string;
  type: "habit" | "counter" | "health" | "reading" | "checklist";
  current: number;
  target: number;
  unit: string | null;
  completed: boolean;
};
export type LaterItem = { id: string; title: string; startTime: string | null };
export type MainMove = { title: string; href: string } | null;

function fmtRight(current: number, target: number, unit: string | null): string {
  const u = unit && unit.length <= 2 ? unit : "";
  return `${current.toLocaleString()} / ${target.toLocaleString()}${u}`;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-[18px] border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      {children}
    </section>
  );
}

export default function TodayHome({
  dateLabel,
  mainMove,
  note,
  rows,
  later,
  today,
}: {
  dateLabel: string;
  mainMove: MainMove;
  note: string;
  rows: ChecklistRow[];
  later: LaterItem[];
  today: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function toggle(row: ChecklistRow) {
    if (row.type === "checklist") return; // checklists are managed on their own list
    start(async () => {
      await logWidget(row.widgetId, { kind: "toggle" });
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      {/* 1 — Daily Briefing */}
      <section className="rounded-[18px] border p-5" style={{ background: "var(--surface)", borderColor: "color-mix(in srgb, var(--accent) 30%, var(--border))" }}>
        <div className="text-[12.5px] font-medium" style={{ color: "var(--muted)" }}>{dateLabel}</div>
        <h1 className="mt-0.5 text-[26px] font-medium tracking-tight">Today</h1>

        {mainMove ? (
          <>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-[13px]" style={{ color: "var(--muted)" }}>Main move</span>
              <span className="text-[18px] font-semibold tracking-tight">{mainMove.title}</span>
            </div>
            <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: "var(--muted)" }}>{note}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={mainMove.href} className="rounded-full px-4 py-2 text-[13px] font-medium text-white" style={{ background: "var(--accent)" }}>
                Start {mainMove.title}
              </Link>
              <button type="button" onClick={() => window.dispatchEvent(new Event("planizmo:assistant"))} className="rounded-full border px-4 py-2 text-[13px] font-medium" style={{ borderColor: "var(--border)", color: "var(--text)", cursor: "pointer" }}>
                Replan with AI
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-[13.5px] leading-relaxed" style={{ color: "var(--muted)" }}>You&apos;re all caught up for today — enjoy the breathing room.</p>
            <div className="mt-4">
              <button type="button" onClick={() => window.dispatchEvent(new Event("planizmo:assistant"))} className="rounded-full border px-4 py-2 text-[13px] font-medium" style={{ borderColor: "var(--border)", color: "var(--text)", cursor: "pointer" }}>
                Plan with AI
              </button>
            </div>
          </>
        )}
      </section>

      {/* 2 — Quick Log (the app-wide AI operator, in card form) */}
      <div>
        <div className="mb-1.5 px-1 text-[12.5px] font-medium" style={{ color: "var(--muted)" }}>Quick log</div>
        <OperatorBar />
      </div>

      {/* 3 — Today's Checklist */}
      <Card>
        <div className="mb-3 text-[14.5px] font-semibold">Today&apos;s checklist</div>
        {rows.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--muted)" }}>No trackers scheduled today. Add one in Trackers.</p>
        ) : (
          <div className="flex flex-col">
            {rows.map((r, i) => {
              const right = (
                <span className="text-[13px] tabular-nums" style={{ color: r.completed ? "var(--accent)" : "var(--muted)" }}>
                  {fmtRight(r.current, r.target, r.unit)}
                </span>
              );
              const circle = (
                <span
                  className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border"
                  style={{ borderColor: r.completed ? "var(--accent)" : "var(--border)", background: r.completed ? "var(--accent)" : "transparent" }}
                >
                  {r.completed && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                </span>
              );
              const inner = (
                <>
                  {circle}
                  <span className="flex-1 truncate text-[14px]" style={{ textDecoration: r.completed ? "line-through" : "none", color: r.completed ? "var(--muted)" : "var(--text)" }}>{r.title}</span>
                  {right}
                </>
              );
              const rowCls = "flex items-center gap-3 py-2.5";
              const border = i > 0 ? { borderTop: "1px solid var(--border)" } : undefined;
              return r.type === "checklist" ? (
                <Link key={r.widgetId} href="/dashboard/lists" className={rowCls} style={border}>{inner}</Link>
              ) : (
                <button key={r.widgetId} type="button" disabled={pending} onClick={() => toggle(r)} className={`${rowCls} text-left`} style={{ ...border, cursor: "pointer" }}>{inner}</button>
              );
            })}
          </div>
        )}
      </Card>

      {/* 4 — Later Today */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[14.5px] font-semibold">Later today</span>
          <Link href={`/dashboard/calendar?v=day&d=${today}`} className="text-[12.5px] font-medium" style={{ color: "var(--accent)" }}>Add time block</Link>
        </div>
        {later.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--muted)" }}>Nothing scheduled yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {later.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-1">
                <span className="w-16 flex-none text-[12.5px]" style={{ color: "var(--muted)" }}>{e.startTime ? fmtTime(e.startTime) : "—"}</span>
                <span className="flex-1 truncate text-[14px]">{e.title}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { approveWeekPlan } from "@/lib/actions/plan";
import type { PlanDay, PlanItem, PlanItemKind, WeekPlan } from "@/lib/plan/types";

type DayMeta = { date: string; weekday: string };

type Props = {
  weekStart: string;
  days: DayMeta[];
  rangeLabel: string;
  prevWeek: string;
  nextWeek: string;
  initialPlan: WeekPlan | null;
  initialStatus: "draft" | "approved" | null;
  initialBrainDump: string;
};

const KIND_STYLE: Record<PlanItemKind, { label: string; color: string }> = {
  habit: { label: "habit", color: "var(--accent)" },
  task: { label: "task", color: "var(--warn)" },
  checklist: { label: "routine", color: "var(--success)" },
  note: { label: "note", color: "var(--muted)" },
};

function emptyDays(days: DayMeta[]): PlanDay[] {
  return days.map((d) => ({ date: d.date, weekday: d.weekday, summary: "", items: [] }));
}

export default function WeekPlanner({
  weekStart,
  days,
  rangeLabel,
  prevWeek,
  nextWeek,
  initialPlan,
  initialStatus,
  initialBrainDump,
}: Props) {
  const [brainDump, setBrainDump] = useState(initialBrainDump);
  const [plan, setPlan] = useState<PlanDay[] | null>(initialPlan?.days ?? null);
  const [status, setStatus] = useState<"draft" | "approved" | null>(initialStatus);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [approving, setApproving] = useState(false);

  async function planWeek() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/plan-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brain_dump_text: brainDump, week_start: weekStart }),
      });
      const d = await res.json();
      if (d.ok) {
        setPlan(d.plan.days as PlanDay[]);
        setStatus("draft");
      } else {
        setError(d.error ?? "Could not plan the week.");
      }
    } catch {
      setError("Could not reach the planner. Try again in a moment.");
    } finally {
      setGenerating(false);
    }
  }

  function mutateDays(fn: (days: PlanDay[]) => PlanDay[]) {
    setPlan((cur) => (cur ? fn(cur.map((d) => ({ ...d, items: [...d.items] }))) : cur));
    if (status === "approved") setStatus("draft"); // edits drop back to draft until re-approved
  }

  function updateItem(dayIdx: number, itemId: string, patch: Partial<PlanItem>) {
    mutateDays((ds) => {
      ds[dayIdx].items = ds[dayIdx].items.map((it) =>
        it.id === itemId ? { ...it, ...patch } : it,
      );
      return ds;
    });
  }
  function removeItem(dayIdx: number, itemId: string) {
    mutateDays((ds) => {
      ds[dayIdx].items = ds[dayIdx].items.filter((it) => it.id !== itemId);
      return ds;
    });
  }
  function moveItem(dayIdx: number, itemId: string, dir: -1 | 1) {
    const target = dayIdx + dir;
    if (target < 0 || target > 6) return;
    mutateDays((ds) => {
      const it = ds[dayIdx].items.find((x) => x.id === itemId);
      if (!it) return ds;
      ds[dayIdx].items = ds[dayIdx].items.filter((x) => x.id !== itemId);
      const moved = { ...it, due_date: it.kind === "task" ? ds[target].date : it.due_date };
      ds[target].items = [...ds[target].items, moved];
      return ds;
    });
  }
  function addItem(dayIdx: number) {
    const id = crypto.randomUUID();
    mutateDays((ds) => {
      ds[dayIdx].items = [
        ...ds[dayIdx].items,
        {
          id,
          kind: "task",
          title: "",
          ref_widget_id: null,
          due_date: ds[dayIdx].date,
          rationale: "Added by you.",
        },
      ];
      return ds;
    });
    setEditing(id);
  }

  function approve() {
    if (!plan) return;
    setApproving(true);
    setError(null);
    startTransition(async () => {
      const res = await approveWeekPlan(weekStart, plan);
      if (res.ok) {
        setPlan(res.plan.days);
        setStatus("approved");
      } else {
        setError(res.error);
      }
      setApproving(false);
    });
  }

  return (
    <div className="flex flex-col">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-4 pt-1">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Plan your week</h1>
          <div className="mt-1 flex items-center gap-2 text-[13px]" style={{ color: "var(--muted)" }}>
            <Link href={`/dashboard/calendar?week=${prevWeek}`} aria-label="Previous week" className="rounded-md px-1.5 py-0.5" style={{ background: "var(--surface2)" }}>←</Link>
            <span>{rangeLabel}</span>
            <Link href={`/dashboard/calendar?week=${nextWeek}`} aria-label="Next week" className="rounded-md px-1.5 py-0.5" style={{ background: "var(--surface2)" }}>→</Link>
            {status === "approved" && (
              <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: "color-mix(in srgb, var(--success) 16%, transparent)", color: "var(--success)" }}>
                approved
              </span>
            )}
            {status === "draft" && (
              <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: "var(--surface2)", color: "var(--muted)" }}>
                draft
              </span>
            )}
          </div>
        </div>
        {plan && (
          <button
            type="button"
            onClick={approve}
            disabled={approving}
            className="rounded-full px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60"
            style={{ background: "var(--accent)", cursor: "pointer" }}
          >
            {approving ? "Approving…" : status === "approved" ? "Re-approve" : "Approve plan"}
          </button>
        )}
      </div>

      {/* brain dump */}
      <div className="rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <label className="text-sm font-medium">What's on your mind for the week?</label>
        <textarea
          value={brainDump}
          onChange={(e) => setBrainDump(e.target.value)}
          rows={3}
          placeholder="dump everything — deadlines, errands, things you want to make time for…"
          className="pz-in pz-scroll mt-2 w-full resize-none rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={planWeek}
            disabled={generating}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: "var(--accent)", cursor: "pointer" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" /></svg>
            {generating ? "Laying out your week…" : plan ? "Re-plan my week" : "Plan my week"}
          </button>
          {error && <span className="text-[13px]" style={{ color: "var(--alert)" }}>{error}</span>}
        </div>
      </div>

      {/* week grid */}
      {plan && (
        <div className="pz-scroll mt-4 flex gap-3 overflow-x-auto pb-2">
          {plan.map((day, dayIdx) => (
            <div
              key={day.date}
              className="flex w-[180px] flex-none flex-col gap-2 rounded-2xl border p-3"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div>
                <div className="text-sm font-medium">{day.weekday}</div>
                <div className="text-[11px]" style={{ color: "var(--muted)" }}>{day.date.slice(5)}</div>
              </div>
              {day.summary && (
                <div className="text-[12px] leading-snug" style={{ color: "var(--muted)" }}>{day.summary}</div>
              )}

              <div className="flex flex-col gap-2">
                {day.items.map((it) => (
                  <div key={it.id} className="rounded-xl p-2.5" style={{ background: "var(--surface2)" }}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: KIND_STYLE[it.kind].color }}>
                        {KIND_STYLE[it.kind].label}
                      </span>
                      <div className="flex items-center gap-0.5" style={{ color: "var(--muted)" }}>
                        <button type="button" onClick={() => moveItem(dayIdx, it.id, -1)} disabled={dayIdx === 0} aria-label="Move earlier" className="px-1 disabled:opacity-30" style={{ cursor: "pointer" }}>◀</button>
                        <button type="button" onClick={() => moveItem(dayIdx, it.id, 1)} disabled={dayIdx === 6} aria-label="Move later" className="px-1 disabled:opacity-30" style={{ cursor: "pointer" }}>▶</button>
                        <button type="button" onClick={() => removeItem(dayIdx, it.id)} aria-label="Remove" className="px-1" style={{ cursor: "pointer" }}>✕</button>
                      </div>
                    </div>
                    {editing === it.id ? (
                      <input
                        autoFocus
                        value={it.title}
                        onChange={(e) => updateItem(dayIdx, it.id, { title: e.target.value })}
                        onBlur={() => setEditing(null)}
                        onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                        placeholder="title"
                        className="pz-in w-full rounded-md border px-2 py-1 text-[13px] outline-none"
                        style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                      />
                    ) : (
                      <button type="button" onClick={() => setEditing(it.id)} className="block w-full text-left text-[13px] font-medium" style={{ cursor: "text" }}>
                        {it.title || "untitled"}
                      </button>
                    )}
                    {it.rationale && (
                      <div className="mt-1 text-[11.5px] leading-snug" style={{ color: "var(--muted)" }}>{it.rationale}</div>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addItem(dayIdx)}
                className="mt-1 flex items-center justify-center gap-1 rounded-lg border-[1.5px] border-dashed py-1.5 text-[12px]"
                style={{ borderColor: "var(--border)", color: "var(--muted)", cursor: "pointer" }}
              >
                + add
              </button>
            </div>
          ))}
        </div>
      )}

      {!plan && !generating && (
        <p className="mt-6 px-1 text-sm" style={{ color: "var(--muted)" }}>
          Write a brain-dump above and I'll lay out a realistic week grounded in your habits and tasks — then you can adjust and approve it.
        </p>
      )}
    </div>
  );
}

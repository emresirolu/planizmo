"use client";

import { useState, useTransition } from "react";
import WidgetIcon from "./WidgetIcon";
import TrendChart, { type TrendPoint } from "./TrendChart";
import { GOAL_ICONS, type ClientGoal, type GoalStatus } from "@/lib/goals/types";
import {
  addGoalAction,
  deleteGoalAction,
  reorderGoalsAction,
  setGoalStatusAction,
  updateGoalAction,
} from "@/lib/actions/goals";

const inputStyle = { background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" } as const;

type LinkWidget = { id: string; title: string };

export default function GoalsBoard({
  initial,
  widgets = [],
  linkedSeries = {},
}: {
  initial: ClientGoal[];
  widgets?: LinkWidget[];
  linkedSeries?: Record<string, TrendPoint[]>;
}) {
  const [goals, setGoals] = useState<ClientGoal[]>(initial);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // add form
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("goal");
  const [nextStep, setNextStep] = useState("");
  const [targetDate, setTargetDate] = useState("");

  function patchLocal(id: string, patch: Partial<ClientGoal>) {
    setGoals((gs) => gs.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  function add() {
    const t = title.trim();
    if (!t) return;
    setErr(null);
    startTransition(async () => {
      const res = await addGoalAction({ title: t, icon, nextStep, targetDate: targetDate || null });
      if (res.ok) {
        setGoals((gs) => [...gs, res.goal]);
        setTitle(""); setNextStep(""); setTargetDate(""); setIcon("goal"); setAdding(false);
      } else {
        setErr(res.error ?? "Could not add goal");
      }
    });
  }

  function saveField(id: string, patch: Partial<ClientGoal>) {
    patchLocal(id, patch);
    startTransition(() => void updateGoalAction(id, patch as never));
  }
  function setStatus(id: string, status: GoalStatus) {
    patchLocal(id, status === "done" ? { status, progressPct: 100 } : { status });
    startTransition(() => void setGoalStatusAction(id, status));
  }
  function remove(id: string) {
    setGoals((gs) => gs.filter((g) => g.id !== id));
    startTransition(() => void deleteGoalAction(id));
  }
  function move(id: string, dir: -1 | 1) {
    setGoals((gs) => {
      const i = gs.findIndex((g) => g.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= gs.length) return gs;
      const copy = gs.slice();
      [copy[i], copy[j]] = [copy[j], copy[i]];
      startTransition(() => void reorderGoalsAction(copy.map((g) => g.id)));
      return copy;
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-medium tracking-tight">Goals</h1>
          <p className="mt-1 text-[13px]" style={{ color: "var(--muted)" }}>The bigger things you're working toward.</p>
        </div>
        <button type="button" onClick={() => setAdding((v) => !v)} className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium text-white" style={{ background: "var(--accent)", cursor: "pointer" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          New goal
        </button>
      </div>

      {err && (
        <div className="mb-3 flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-[13px]" style={{ borderColor: "color-mix(in srgb, var(--accent) 26%, transparent)", background: "color-mix(in srgb, var(--accent) 8%, transparent)" }}>
          <span style={{ color: "var(--muted)" }}>{err}</span>
          <a href="/dashboard/upgrade" className="font-medium" style={{ color: "var(--accent)" }}>Upgrade →</a>
        </div>
      )}

      {adding && (
        <div className="mb-4 flex flex-col gap-3 rounded-[18px] border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="goal title" className="pz-in rounded-xl border px-3 py-2.5 text-sm outline-none" style={inputStyle} />
          <input value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="next step (optional)" className="pz-in rounded-xl border px-3 py-2.5 text-sm outline-none" style={inputStyle} />
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              {GOAL_ICONS.map((ic) => (
                <button key={ic} type="button" onClick={() => setIcon(ic)} aria-label={ic} className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ background: icon === ic ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--surface2)", color: icon === ic ? "var(--accent)" : "var(--muted)", border: `1px solid ${icon === ic ? "var(--accent)" : "var(--border)"}`, cursor: "pointer" }}>
                  <WidgetIcon name={ic} size={17} />
                </button>
              ))}
            </div>
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="rounded-xl border px-2.5 py-2 text-[13px] outline-none" style={inputStyle} />
            <div className="flex-1" />
            <button type="button" onClick={() => setAdding(false)} className="rounded-xl border px-3.5 py-2 text-sm" style={{ borderColor: "var(--border)", color: "var(--muted)", cursor: "pointer" }}>Cancel</button>
            <button type="button" onClick={add} disabled={!title.trim()} className="rounded-xl px-3.5 py-2 text-sm font-medium text-white disabled:opacity-60" style={{ background: "var(--accent)", cursor: "pointer" }}>Add goal</button>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>No goals yet. Add one above and it'll show on your dashboard and feed your plans.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {goals.map((g, idx) => (
            <div key={g.id} className="rounded-[18px] border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)", opacity: g.status === "paused" ? 0.7 : 1 }}>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px]" style={{ background: "var(--surface2)", color: g.status === "done" ? "var(--success)" : "var(--accent)" }}>
                  <WidgetIcon name={g.icon} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <input value={g.title} onChange={(e) => patchLocal(g.id, { title: e.target.value })} onBlur={(e) => saveField(g.id, { title: e.target.value })} className="min-w-0 flex-1 border-none bg-transparent text-sm font-medium outline-none" style={{ color: "var(--text)", textDecoration: g.status === "done" ? "line-through" : "none" }} />
                    {g.status === "done" && <span className="flex-none rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: "color-mix(in srgb, var(--success) 16%, transparent)", color: "var(--success)" }}>done</span>}
                    {g.status === "paused" && <span className="flex-none rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: "var(--surface2)", color: "var(--muted)" }}>paused</span>}
                  </div>
                  <input value={g.nextStep ?? ""} onChange={(e) => patchLocal(g.id, { nextStep: e.target.value })} onBlur={(e) => saveField(g.id, { nextStep: e.target.value })} placeholder="next step…" className="pz-in mt-0.5 w-full border-none bg-transparent text-[12.5px] outline-none" style={{ color: "var(--muted)" }} />

                  <div className="mt-2.5 flex items-center gap-3">
                    <input type="range" min={0} max={100} value={g.progressPct} onChange={(e) => patchLocal(g.id, { progressPct: Number(e.target.value) })} onPointerUp={(e) => saveField(g.id, { progressPct: Number((e.target as HTMLInputElement).value) })} onKeyUp={(e) => saveField(g.id, { progressPct: Number((e.target as HTMLInputElement).value) })} className="h-1.5 flex-1 cursor-pointer" style={{ accentColor: "var(--accent)" }} />
                    <span className="w-10 flex-none text-right text-[13px]" style={{ color: "var(--muted)" }}>{g.progressPct}%</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                {g.status !== "done" && (
                  <button type="button" onClick={() => setStatus(g.id, "done")} className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium" style={{ background: "color-mix(in srgb, var(--success) 14%, transparent)", color: "var(--success)", cursor: "pointer" }}>Complete</button>
                )}
                {g.status === "active" ? (
                  <button type="button" onClick={() => setStatus(g.id, "paused")} className="rounded-lg px-2.5 py-1.5 text-[12.5px]" style={{ background: "var(--surface2)", color: "var(--muted)", cursor: "pointer" }}>Pause</button>
                ) : (
                  <button type="button" onClick={() => setStatus(g.id, "active")} className="rounded-lg px-2.5 py-1.5 text-[12.5px]" style={{ background: "var(--surface2)", color: "var(--text)", cursor: "pointer" }}>{g.status === "done" ? "Reopen" : "Resume"}</button>
                )}
                <div className="flex-1" />
                <button type="button" onClick={() => move(g.id, -1)} disabled={idx === 0} aria-label="Move up" className="px-1.5 py-1 disabled:opacity-30" style={{ color: "var(--muted)", cursor: "pointer" }}>↑</button>
                <button type="button" onClick={() => move(g.id, 1)} disabled={idx === goals.length - 1} aria-label="Move down" className="px-1.5 py-1 disabled:opacity-30" style={{ color: "var(--muted)", cursor: "pointer" }}>↓</button>
                <button type="button" onClick={() => remove(g.id)} aria-label="Delete" className="px-1.5 py-1" style={{ color: "var(--muted)", cursor: "pointer" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>

              <GoalExtras
                goal={g}
                widgets={widgets}
                series={g.linkedWidgetId ? linkedSeries[g.linkedWidgetId] ?? [] : []}
                onLink={(wid) => saveField(g.id, { linkedWidgetId: wid })}
                onSetNextStep={(step) => saveField(g.id, { nextStep: step })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GoalExtras({
  goal,
  widgets,
  series,
  onLink,
  onSetNextStep,
}: {
  goal: ClientGoal;
  widgets: LinkWidget[];
  series: TrendPoint[];
  onLink: (widgetId: string | null) => void;
  onSetNextStep: (step: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function breakdown() {
    setLoading(true);
    try {
      const res = await fetch("/api/goals/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId: goal.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.ok && Array.isArray(d.steps)) { setSteps(d.steps); setOpen(true); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  return (
    <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px]" style={{ color: "var(--muted)" }}>Linked tracker</span>
        <select
          value={goal.linkedWidgetId ?? ""}
          onChange={(e) => onLink(e.target.value || null)}
          className="rounded-lg border px-2 py-1 text-[12.5px] outline-none"
          style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
        >
          <option value="">none</option>
          {widgets.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
        </select>
        <div className="flex-1" />
        <button type="button" onClick={breakdown} disabled={loading} className="rounded-full px-3 py-1.5 text-[12.5px] font-medium disabled:opacity-60" style={{ background: "color-mix(in srgb, var(--accent) 13%, transparent)", color: "var(--accent)", cursor: "pointer" }}>
          {loading ? "Thinking…" : steps ? "Re-break down" : "Break it down with AI"}
        </button>
      </div>

      {goal.linkedWidgetId && series.length > 0 && (
        <div className="mt-3">
          <TrendChart data={series} label="Weekly completion" unit="%" direction="up" height={140} />
        </div>
      )}

      {open && steps && (
        <ol className="mt-3 flex flex-col gap-1.5">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px]">
              <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full text-[10px] font-semibold" style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }}>{i + 1}</span>
              <span className="flex-1">{s}</span>
              <button type="button" onClick={() => onSetNextStep(s)} className="flex-none text-[11px]" style={{ color: "var(--accent)", cursor: "pointer" }}>set as next</button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

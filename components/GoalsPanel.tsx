"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import WidgetIcon from "./WidgetIcon";
import { addGoalAction, deleteGoalAction, updateGoalAction } from "@/lib/actions/goals";
import type { ClientGoal } from "@/lib/goals/types";

/** Goals panel with inline add / edit / delete — no navigation needed. */
export default function GoalsPanel({ goals: initial }: { goals: ClientGoal[] }) {
  const [goals, setGoals] = useState<ClientGoal[]>(initial.filter((g) => g.status === "active"));
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [next, setNext] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [eTitle, setETitle] = useState("");
  const [eNext, setENext] = useState("");
  const [ePct, setEPct] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [, start] = useTransition();

  const shown = goals.slice(0, 4);

  function submitAdd() {
    const t = title.trim();
    if (!t) return;
    setErr(null);
    start(async () => {
      const res = await addGoalAction({ title: t, nextStep: next });
      if (res.ok) {
        setGoals((g) => [...g, res.goal]);
        setTitle(""); setNext(""); setAdding(false);
      } else setErr(res.error);
    });
  }
  function openEdit(g: ClientGoal) {
    setEditing(g.id); setETitle(g.title); setENext(g.nextStep ?? ""); setEPct(g.progressPct);
  }
  function saveEdit(id: string) {
    const t = eTitle.trim();
    if (!t) return;
    setGoals((g) => g.map((x) => (x.id === id ? { ...x, title: t, nextStep: eNext || null, progressPct: ePct } : x)));
    setEditing(null);
    start(() => void updateGoalAction(id, { title: t, nextStep: eNext || null, progressPct: ePct }));
  }
  function remove(id: string) {
    setGoals((g) => g.filter((x) => x.id !== id));
    if (editing === id) setEditing(null);
    start(() => void deleteGoalAction(id));
  }

  const inStyle = { background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" };

  return (
    <section className="rounded-[18px] border p-[18px]" style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "0 1px 2px rgba(15,23,42,.04), 0 6px 16px rgba(15,23,42,.05)" }}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[15px] font-semibold tracking-tight">Goals</span>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setAdding((a) => !a)} className="text-[13px] font-medium" style={{ color: "var(--accent)", cursor: "pointer" }}>{adding ? "Cancel" : "+ Add"}</button>
          <Link href="/dashboard/goals" className="text-[13px]" style={{ color: "var(--muted)" }}>View all</Link>
        </div>
      </div>

      {adding && (
        <div className="mb-2 mt-2 flex flex-col gap-2 rounded-xl border p-2.5" style={{ borderColor: "var(--border)" }}>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitAdd()} placeholder="New goal" className="pz-in rounded-lg border px-2.5 py-1.5 text-sm outline-none" style={inStyle} />
          <input value={next} onChange={(e) => setNext(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitAdd()} placeholder="Next step (optional)" className="pz-in rounded-lg border px-2.5 py-1.5 text-[13px] outline-none" style={inStyle} />
          {err && <span className="text-[12px]" style={{ color: "var(--alert)" }}>{err}</span>}
          <button type="button" onClick={submitAdd} className="self-start rounded-lg px-3 py-1.5 text-[13px] font-medium text-white" style={{ background: "var(--accent)", cursor: "pointer" }}>Add goal</button>
        </div>
      )}

      {shown.length === 0 && !adding ? (
        <p className="py-2 text-[13px] leading-relaxed" style={{ color: "var(--muted)" }}>
          No goals yet. <button type="button" onClick={() => setAdding(true)} style={{ color: "var(--accent)", cursor: "pointer" }}>Set one</button> and Planizmo will tie your weeks back to it.
        </p>
      ) : (
        shown.map((g, i) => (
          <div key={g.id} className="flex gap-3 py-3" style={i < shown.length - 1 ? { borderBottom: "1px solid var(--border)" } : undefined}>
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px]" style={{ background: "var(--surface2)", color: "var(--text)" }}>
              <WidgetIcon name={g.icon} size={18} />
            </span>
            <div className="min-w-0 flex-1">
              {editing === g.id ? (
                <div className="flex flex-col gap-1.5">
                  <input autoFocus value={eTitle} onChange={(e) => setETitle(e.target.value)} className="pz-in rounded-md border px-2 py-1 text-sm outline-none" style={inStyle} />
                  <input value={eNext} onChange={(e) => setENext(e.target.value)} placeholder="Next step" className="pz-in rounded-md border px-2 py-1 text-[13px] outline-none" style={inStyle} />
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={100} step={5} value={ePct} onChange={(e) => setEPct(Number(e.target.value))} className="flex-1" style={{ accentColor: "var(--accent)" }} />
                    <span className="w-10 text-right text-[12px]" style={{ color: "var(--muted)" }}>{ePct}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => saveEdit(g.id)} className="rounded-md px-2.5 py-1 text-[12.5px] font-medium text-white" style={{ background: "var(--accent)", cursor: "pointer" }}>Save</button>
                    <button type="button" onClick={() => setEditing(null)} className="text-[12.5px]" style={{ color: "var(--muted)", cursor: "pointer" }}>Cancel</button>
                    <button type="button" onClick={() => remove(g.id)} className="ml-auto text-[12.5px]" style={{ color: "var(--alert)", cursor: "pointer" }}>Delete</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <button type="button" onClick={() => openEdit(g)} className="min-w-0 flex-1 truncate text-left text-sm font-medium" style={{ cursor: "text" }}>{g.title}</button>
                    <span className="flex-none text-[13px]" style={{ color: "var(--muted)" }}>{g.progressPct}%</span>
                  </div>
                  {g.nextStep && <div className="mt-0.5 truncate text-[12.5px]" style={{ color: "var(--muted)" }}>Next: {g.nextStep}</div>}
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface2)" }}>
                    <div className="h-full rounded-full" style={{ width: `${g.progressPct}%`, background: "var(--accent)" }} />
                  </div>
                </>
              )}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

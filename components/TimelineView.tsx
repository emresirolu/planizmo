"use client";

import { useState, useTransition } from "react";
import { CATEGORIES, CATEGORY_COLOR, CATEGORY_LABEL, type Category } from "@/lib/plan/categories";
import { endLabel, formatTime, type ClientTimeBlock } from "@/lib/plan/timeline";
import { addTimeBlockAction, removeTimeBlockAction, toggleTimeBlockAction, updateTimeBlockAction } from "@/lib/actions/timeline";

export default function TimelineView({ initial }: { initial: ClientTimeBlock[] }) {
  const [blocks, setBlocks] = useState<ClientTimeBlock[]>(initial);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // add-form state
  const [time, setTime] = useState("09:00");
  const [dur, setDur] = useState("60");
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState<Category>("focus");

  const sorted = [...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime));

  function toggle(b: ClientTimeBlock) {
    setBlocks((bs) => bs.map((x) => (x.id === b.id ? { ...x, completed: !x.completed } : x)));
    startTransition(() => void toggleTimeBlockAction(b.id, !b.completed));
  }
  function remove(b: ClientTimeBlock) {
    setBlocks((bs) => bs.filter((x) => x.id !== b.id));
    startTransition(() => void removeTimeBlockAction(b.id));
  }
  function rename(b: ClientTimeBlock, t: string) {
    setBlocks((bs) => bs.map((x) => (x.id === b.id ? { ...x, title: t } : x)));
    startTransition(() => void updateTimeBlockAction(b.id, { title: t }));
  }
  function add() {
    const t = title.trim();
    if (!t) return;
    startTransition(async () => {
      const res = await addTimeBlockAction({ startTime: time, durationMin: Number(dur), title: t, category: cat });
      if (res.ok) {
        setBlocks((bs) => [...bs, res.block]);
        setTitle("");
        setAdding(false);
      }
    });
  }

  return (
    <div className="flex flex-col">
      {sorted.length === 0 && !adding && (
        <p className="py-4 text-sm" style={{ color: "var(--muted)" }}>
          No time blocks yet. Add one below, or ask the assistant to plan your day into the timeline.
        </p>
      )}

      <div className="flex flex-col">
        {sorted.map((b) => {
          const color = CATEGORY_COLOR[b.category];
          return (
            <div key={b.id} className="flex gap-3.5">
              <div className="w-[54px] flex-none pt-4 text-right text-[12.5px]" style={{ color: "var(--muted)" }}>{formatTime(b.startTime)}</div>
              <div className="flex flex-none flex-col items-center pt-[18px]">
                <button type="button" onClick={() => toggle(b)} aria-label="Toggle complete" className="h-[13px] w-[13px] rounded-full" style={{ border: `2px solid ${b.completed ? "var(--success)" : color}`, background: b.completed ? "var(--success)" : "var(--surface)", cursor: "pointer" }} />
                <div className="min-h-[14px] w-[1.5px] flex-1" style={{ background: "var(--border)" }} />
              </div>
              <div className="mb-2.5 flex flex-1 items-center gap-3 rounded-[13px] border px-[13px] py-[11px]" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
                <div className="min-w-0 flex-1">
                  {editing === b.id ? (
                    <input autoFocus value={b.title} onChange={(e) => setBlocks((bs) => bs.map((x) => x.id === b.id ? { ...x, title: e.target.value } : x))} onBlur={() => { rename(b, b.title); setEditing(null); }} onKeyDown={(e) => { if (e.key === "Enter") { rename(b, b.title); setEditing(null); } }} className="pz-in w-full rounded-md border px-2 py-1 text-sm outline-none" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
                  ) : (
                    <button type="button" onClick={() => setEditing(b.id)} className="block w-full truncate text-left text-sm font-medium" style={{ textDecoration: b.completed ? "line-through" : "none", color: b.completed ? "var(--muted)" : "var(--text)", cursor: "text" }}>{b.title}</button>
                  )}
                  <div className="mt-0.5 text-[12.5px]" style={{ color: "var(--muted)" }}>{formatTime(b.startTime)} – {endLabel(b.startTime, b.durationMin)} · {b.durationMin}m</div>
                </div>
                <span className="flex-none rounded-full px-2.5 py-1 text-[11.5px] font-medium" style={{ color, background: `color-mix(in srgb, ${color} 13%, transparent)` }}>{CATEGORY_LABEL[b.category]}</span>
                <button type="button" onClick={() => remove(b)} aria-label="Remove" className="flex h-6 w-6 flex-none items-center justify-center rounded-full" style={{ color: "var(--muted)", opacity: 0.5, cursor: "pointer" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {adding ? (
        <div className="mt-2 flex flex-col gap-2 rounded-[13px] border p-3" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="block title" className="pz-in rounded-lg border px-2.5 py-2 text-sm outline-none" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
          <div className="flex flex-wrap gap-2">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-lg border px-2 py-1.5 text-[13px] outline-none" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} />
            <input value={dur} onChange={(e) => setDur(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="w-16 rounded-lg border px-2 py-1.5 text-[13px] outline-none" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }} aria-label="duration minutes" />
            <select value={cat} onChange={(e) => setCat(e.target.value as Category)} className="rounded-lg border px-2 py-1.5 text-[13px] outline-none" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}>
              {CATEGORIES.map((c) => (<option key={c} value={c}>{CATEGORY_LABEL[c]}</option>))}
            </select>
            <div className="flex-1" />
            <button type="button" onClick={() => setAdding(false)} className="rounded-lg border px-3 py-1.5 text-[13px]" style={{ borderColor: "var(--border)", color: "var(--muted)", cursor: "pointer" }}>Cancel</button>
            <button type="button" onClick={add} disabled={!title.trim()} className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-60" style={{ background: "var(--accent)", cursor: "pointer" }}>Add</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="mt-1 flex items-center gap-1.5 self-start py-2 text-[13.5px]" style={{ color: "var(--muted)", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Add time block
        </button>
      )}
    </div>
  );
}

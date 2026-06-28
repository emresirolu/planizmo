"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Locale-correct date picker. Output is always ISO yyyy-mm-dd (locale-independent),
 * display is clear en-US (no browser "gg.aa.yyyy" placeholder leakage).
 */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function parseISO(v: string | null): { y: number; m: number; d: number } | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [y, m, d] = v.split("-").map(Number);
  return { y, m: m - 1, d };
}

export function formatDisplay(v: string | null): string {
  const p = parseISO(v);
  if (!p) return "";
  return `${MONTHS[p.m].slice(0, 3)} ${p.d}, ${p.y}`;
}

export default function DatePicker({
  value,
  onChange,
  todayIso,
  placeholder = "Set date",
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
  todayIso: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sel = parseISO(value);
  const base = sel ?? parseISO(todayIso)!;
  const [view, setView] = useState({ y: base.y, m: base.m });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const firstDow = (new Date(Date.UTC(view.y, view.m, 1)).getUTCDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const inputStyle = { background: "var(--surface2)", borderColor: "var(--border)" };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[13px] outline-none"
        style={{ ...inputStyle, color: value ? "var(--text)" : "var(--muted)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></svg>
        {value ? formatDisplay(value) : placeholder}
        {value && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear date"
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            className="ml-0.5 opacity-60"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-[244px] rounded-xl border p-2.5 shadow-lg" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Previous month" onClick={() => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))} className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ color: "var(--muted)", cursor: "pointer" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <span className="text-[13px] font-medium">{MONTHS[view.m]} {view.y}</span>
            <button type="button" aria-label="Next month" onClick={() => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))} className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ color: "var(--muted)", cursor: "pointer" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px]" style={{ color: "var(--muted)" }}>
            {DOW.map((d) => <span key={d} className="py-1">{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => {
              if (d == null) return <span key={`e${i}`} />;
              const cellIso = iso(view.y, view.m, d);
              const isSel = value === cellIso;
              const isToday = todayIso === cellIso;
              return (
                <button
                  key={cellIso}
                  type="button"
                  onClick={() => { onChange(cellIso); setOpen(false); }}
                  className="flex h-8 items-center justify-center rounded-lg text-[13px]"
                  style={{
                    background: isSel ? "var(--accent)" : "transparent",
                    color: isSel ? "#fff" : "var(--text)",
                    fontWeight: isToday ? 700 : 400,
                    cursor: "pointer",
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2 border-t pt-2" style={{ borderColor: "var(--border)" }}>
            {[["Today", 0], ["Tomorrow", 1], ["+1wk", 7]].map(([label, off]) => (
              <button
                key={label as string}
                type="button"
                onClick={() => {
                  const t = parseISO(todayIso)!;
                  const dt = new Date(Date.UTC(t.y, t.m, t.d + (off as number)));
                  onChange(iso(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
                  setOpen(false);
                }}
                className="rounded-md px-2 py-1 text-[11.5px]"
                style={{ background: "var(--surface2)", color: "var(--muted)", cursor: "pointer" }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

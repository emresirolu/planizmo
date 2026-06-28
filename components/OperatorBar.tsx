"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/* ---- shapes mirror the /api/operator responses ---- */
type AppliedItem = {
  widgetId: string;
  title: string;
  unit: string | null;
  type: string;
  date: string;
  value: number | null;
  completed: boolean;
  prevValue: number | null;
  prevCompleted: boolean;
  hadLog: boolean;
};
type PendingItem = {
  widgetId: string;
  title: string;
  unit: string | null;
  type: string;
  value: number | null;
  reason: string | null;
};
type ParseResponse = {
  ok: boolean;
  error?: string;
  date: string;
  applied: AppliedItem[];
  pending: PendingItem[];
  unmatched: string[];
  noModel: boolean;
};

const Sparkle = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" />
  </svg>
);
const Check = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const EXAMPLES = [
  "hit the gym, 180g protein, 2200 calories, 3h screen time",
  "weighed 78kg, slept 7.5 hours, 9k steps",
  "read 30 pages, mood great, drank 6 glasses of water",
];

function fmtVal(value: number | null, unit: string | null): string {
  if (value == null) return "";
  const u = unit ?? "";
  if (!u) return String(value);
  return u.length <= 2 ? `${value}${u}` : `${value} ${u}`;
}

export default function OperatorBar() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<string>("");
  const [applied, setApplied] = useState<AppliedItem[]>([]);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [noModel, setNoModel] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Record<string, boolean>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [phIdx, setPhIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Gently rotate the placeholder examples so the bar feels alive + teaches.
  useEffect(() => {
    const id = window.setInterval(() => setPhIdx((i) => (i + 1) % EXAMPLES.length), 4200);
    return () => window.clearInterval(id);
  }, []);

  const hasResult = applied.length > 0 || pending.length > 0 || unmatched.length > 0 || noModel || note != null;

  function refreshData() {
    router.refresh();
    window.dispatchEvent(new Event("planizmo:data-changed"));
  }

  async function submit() {
    const text = input.trim();
    if (!text || parsing) return;
    setParsing(true);
    setError(null);
    setApplied([]);
    setPending([]);
    setUnmatched([]);
    setNoModel(false);
    setNote(null);
    try {
      const res = await fetch("/api/operator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "parse", text }),
      });
      const d = (await res.json().catch(() => ({}))) as ParseResponse;
      if (!res.ok || !d.ok) {
        setError(d.error || "I couldn't process that — try again.");
        return;
      }
      setDate(d.date);
      setApplied(d.applied || []);
      setPending(d.pending || []);
      setUnmatched(d.unmatched || []);
      setNoModel(Boolean(d.noModel));
      const nothing = !(d.applied?.length || d.pending?.length || d.unmatched?.length || d.noModel);
      if (nothing) setNote("I didn't catch anything to log — mention a tracker, e.g. “180g protein” or “8k steps”.");
      setEdits(Object.fromEntries((d.pending || []).map((p) => [p.widgetId, p.value == null ? "" : String(p.value)])));
      if ((d.applied || []).length > 0) {
        setInput("");
        refreshData();
      }
    } catch {
      setError("I couldn't reach the server — your data is safe. Try again.");
    } finally {
      setParsing(false);
    }
  }

  async function confirmPending(item: PendingItem) {
    if (confirming[item.widgetId]) return;
    const isBinary = item.type === "habit";
    const value = isBinary ? null : Number(edits[item.widgetId]);
    if (!isBinary && !Number.isFinite(value)) {
      setError("Enter a number to log that one.");
      return;
    }
    setConfirming((c) => ({ ...c, [item.widgetId]: true }));
    try {
      const res = await fetch("/api/operator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "apply", items: [{ widgetId: item.widgetId, value, date }] }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok: boolean; applied: AppliedItem[] };
      if (d.ok && d.applied?.length) {
        setApplied((a) => [...a, ...d.applied]);
        setPending((p) => p.filter((x) => x.widgetId !== item.widgetId));
        refreshData();
      } else {
        setError("Couldn't save that one — try again.");
      }
    } catch {
      setError("Couldn't save that one — try again.");
    } finally {
      setConfirming((c) => ({ ...c, [item.widgetId]: false }));
    }
  }

  function skipPending(widgetId: string) {
    setPending((p) => p.filter((x) => x.widgetId !== widgetId));
  }

  async function undoAll() {
    const items = applied;
    setApplied([]);
    try {
      await fetch("/api/operator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "undo", items }),
      });
    } catch {
      /* best-effort; refresh reflects truth */
    }
    refreshData();
  }

  function dismiss() {
    setApplied([]);
    setPending([]);
    setUnmatched([]);
    setNoModel(false);
    setNote(null);
    setError(null);
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div
        className="rounded-[16px] border p-2.5"
        style={{
          background: "var(--surface)",
          borderColor: "color-mix(in srgb, var(--accent) 30%, var(--border))",
          boxShadow: "0 1px 2px rgba(0,0,0,.04)",
        }}
      >
        <div className="flex items-center gap-2.5 rounded-[12px] px-3 py-1.5" style={{ background: "var(--surface2)" }}>
          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg" style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }}>
            <Sparkle />
          </span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void submit(); } }}
            placeholder={`Tell me what you did — e.g. "${EXAMPLES[phIdx]}"`}
            className="pz-in min-w-0 flex-1 border-none bg-transparent text-[14px] outline-none"
            style={{ color: "var(--text)" }}
            aria-label="Talk to log"
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!input.trim() || parsing}
            className="flex flex-none items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-medium text-white disabled:opacity-50"
            style={{ background: "var(--accent)", cursor: "pointer" }}
          >
            {parsing ? "Reading…" : "Log it"}
          </button>
        </div>

        {error && (
          <div className="mt-2 px-1 text-[12.5px]" style={{ color: "var(--danger, #d4544f)" }}>{error}</div>
        )}

        {hasResult && (
          <div className="mt-2.5 flex flex-col gap-2.5 px-0.5">
            {/* applied — clear summary of exactly what was written, with undo */}
            {applied.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {applied.map((a) => (
                  <span
                    key={a.widgetId}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium"
                    style={{ background: "color-mix(in srgb, var(--success, #3a9d6e) 16%, transparent)", color: "var(--success, #3a9d6e)" }}
                  >
                    <Check />
                    {a.title}
                    {a.value != null && <span style={{ opacity: 0.85 }}>· {fmtVal(a.value, a.unit)}</span>}
                  </span>
                ))}
                <button type="button" onClick={() => void undoAll()} className="rounded-full border px-2.5 py-1 text-[12px]" style={{ borderColor: "var(--border)", color: "var(--muted)", cursor: "pointer" }}>
                  Undo
                </button>
              </div>
            )}

            {/* pending — ambiguous / odd values, confirmed before writing */}
            {pending.map((p) => {
              const isBinary = p.type === "habit";
              return (
                <div key={p.widgetId} className="flex flex-wrap items-center gap-2 rounded-[12px] border px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--surface2)" }}>
                  <span className="text-[13px] font-medium">{p.title}</span>
                  {!isBinary && (
                    <span className="inline-flex items-center gap-1">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={edits[p.widgetId] ?? ""}
                        onChange={(e) => setEdits((m) => ({ ...m, [p.widgetId]: e.target.value }))}
                        className="pz-in w-20 rounded-lg border px-2 py-1 text-[13px] outline-none"
                        style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                      />
                      {p.unit && <span className="text-[12.5px]" style={{ color: "var(--muted)" }}>{p.unit}</span>}
                    </span>
                  )}
                  {p.reason && <span className="text-[12px]" style={{ color: "var(--muted)" }}>· {p.reason}</span>}
                  <span className="flex-1" />
                  <button type="button" disabled={confirming[p.widgetId]} onClick={() => void confirmPending(p)} className="rounded-full px-3 py-1 text-[12.5px] font-medium text-white disabled:opacity-50" style={{ background: "var(--accent)", cursor: "pointer" }}>
                    {isBinary ? "Yes, log it" : "Log it"}
                  </button>
                  <button type="button" onClick={() => skipPending(p.widgetId)} className="rounded-full border px-3 py-1 text-[12.5px]" style={{ borderColor: "var(--border)", color: "var(--muted)", cursor: "pointer" }}>
                    Skip
                  </button>
                </div>
              );
            })}

            {/* unmatched — never silently dropped */}
            {unmatched.length > 0 && (
              <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>
                Couldn&apos;t match: {unmatched.join(", ")}. Add a tracker for it, or rephrase.
              </div>
            )}

            {note && (
              <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>{note}</div>
            )}

            {noModel && applied.length === 0 && pending.length === 0 && (
              <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>
                AI logging isn&apos;t configured (no model key). You can still log by tapping your trackers.
              </div>
            )}

            <div>
              <button type="button" onClick={dismiss} className="text-[12px]" style={{ color: "var(--muted)", cursor: "pointer" }}>
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

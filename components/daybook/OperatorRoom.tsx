"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Applied = { targetId: string; kind: string; title: string; unit: string | null; value: number | null; completed: boolean };
type Pending = { targetId: string; kind: string; binary: boolean; title: string; unit: string | null; value: number | null; reason: string | null };
type ActionCard =
  | { type: "updated"; title: string; detail: string }
  | { type: "confirm"; item: Pending }
  | { type: "note"; text: string };

const SUGGESTIONS = [
  "gym done, 8k steps, 150g protein",
  "slept 7h, mood good",
  "weighed 78kg",
];

function fmtVal(v: number | null, unit: string | null) {
  if (v == null) return "done";
  const u = unit ?? "";
  return u.length <= 2 ? `${v}${u}` : `${v} ${u}`;
}

export default function OperatorRoom() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [cards, setCards] = useState<ActionCard[]>([]);
  const [date, setDate] = useState<string>("");

  async function run(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/operator", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "parse", text: t }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) { setCards((c) => [{ type: "note", text: d.error || "I couldn't process that." }, ...c]); return; }
      setDate(d.date);
      const next: ActionCard[] = [];
      for (const a of (d.applied || []) as Applied[]) next.push({ type: "updated", title: a.title, detail: fmtVal(a.value, a.unit) });
      for (const p of (d.pending || []) as Pending[]) next.push({ type: "confirm", item: p });
      for (const u of (d.unmatched || []) as string[]) next.push({ type: "note", text: `Couldn't match "${u}".` });
      if (next.length === 0) next.push({ type: "note", text: "Nothing to act on — mention a tracker like protein or steps." });
      setCards((c) => [...next, ...c]);
      setInput("");
      router.refresh();
    } catch {
      setCards((c) => [{ type: "note", text: "Couldn't reach the server — try again." }, ...c]);
    } finally {
      setBusy(false);
    }
  }

  async function confirm(p: Pending) {
    const value = p.binary ? null : p.value;
    const res = await fetch("/api/operator", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "apply", items: [{ targetId: p.targetId, kind: p.kind, value, date }] }),
    });
    const d = await res.json().catch(() => ({}));
    if (d.ok && d.applied?.length) {
      const a = d.applied[0] as Applied;
      setCards((c) => c.map((card) => (card.type === "confirm" && card.item.targetId === p.targetId ? { type: "updated", title: a.title, detail: fmtVal(a.value, a.unit) } : card)));
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-7 md:px-8">
      <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", color: "var(--muted)" }}>
        Tell the Operator what you did or what to do. It acts — and shows you each change.
      </div>

      <div className="mt-5 rounded-[12px] border p-2.5" style={{ background: "var(--surface)", borderColor: "color-mix(in srgb, var(--accent) 30%, var(--border))" }}>
        <div className="flex items-center gap-2.5 rounded-[10px] px-3 py-1.5" style={{ background: "var(--surface2)" }}>
          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-md" style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 7h14M5 12h9M5 17h12" /></svg>
          </span>
          <input
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void run(input); } }}
            placeholder="e.g. gym done, 8k steps, 150g protein"
            className="pz-in min-w-0 flex-1 border-none bg-transparent text-[14.5px] outline-none"
            style={{ color: "var(--ink)" }}
          />
          <button type="button" onClick={() => void run(input)} disabled={!input.trim() || busy} className="flex-none rounded-[8px] px-4 py-2 text-[13px] font-semibold disabled:opacity-50" style={{ background: "var(--accent)", color: "#F6F1E6", cursor: "pointer" }}>
            {busy ? "Working…" : "Run"}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 px-1">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => void run(s)} disabled={busy} className="rounded-full border px-3 py-1 text-[12px]" style={{ borderColor: "var(--border)", color: "var(--muted)", cursor: "pointer" }}>{s}</button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".16em", color: "var(--faint)" }}>ACTIONS</div>
        {cards.length === 0 ? (
          <div className="mt-3 rounded-[12px] border px-5 py-10 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 17 }}>No actions yet.</div>
            <p className="mt-1 text-[13px]" style={{ color: "var(--muted)" }}>Run a command above and the Operator will log it here.</p>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {cards.map((c, i) => {
              if (c.type === "updated") return (
                <div key={i} className="flex items-center gap-3 rounded-[10px] border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full" style={{ background: "var(--accent)", color: "#F6F1E6" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
                  <div className="flex-1"><span style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".12em", color: "var(--faint)" }}>UPDATED TRACKER</span><div className="text-[14px]">{c.title} <span style={{ color: "var(--muted)" }}>· {c.detail}</span></div></div>
                </div>
              );
              if (c.type === "confirm") return (
                <div key={i} className="flex flex-wrap items-center gap-3 rounded-[10px] border px-4 py-3" style={{ borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 6%, var(--surface))" }}>
                  <div className="flex-1"><span style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".12em", color: "var(--accent)" }}>CONFIRM</span><div className="text-[14px]">{c.item.title}{c.item.value != null ? ` · ${fmtVal(c.item.value, c.item.unit)}` : ""}{c.item.reason ? ` — ${c.item.reason}` : ""}</div></div>
                  <button type="button" onClick={() => void confirm(c.item)} className="rounded-full px-3 py-1 text-[12.5px] font-semibold" style={{ background: "var(--accent)", color: "#F6F1E6", cursor: "pointer" }}>Apply</button>
                </div>
              );
              return (
                <div key={i} className="rounded-[10px] border px-4 py-3 text-[13px]" style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--muted)" }}>{c.text}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

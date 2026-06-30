"use client";

import { useState, useTransition } from "react";
import { addGoalAction } from "@/lib/actions/goals";
import { addEventAction } from "@/lib/actions/calendar";
import { quickCaptureTask } from "@/lib/actions/plan";

const MODES: { key: string; label: string; blurb: string }[] = [
  { key: "socratic", label: "Socratic", blurb: "Questions that sharpen your own thinking." },
  { key: "decision", label: "Decision", blurb: "Options, the trade-off, a recommendation." },
  { key: "idea", label: "Idea", blurb: "Expand a thought into directions." },
  { key: "reflection", label: "Reflection", blurb: "Make sense of what happened." },
  { key: "devils-advocate", label: "Devil's advocate", blurb: "The strongest case against." },
];

export default function ThinkRoom() {
  const [mode, setMode] = useState("decision");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [, start] = useTransition();

  const activeMode = MODES.find((m) => m.key === mode)!;

  async function think() {
    const p = prompt.trim();
    if (!p || busy) return;
    setBusy(true); setResponse(null);
    try {
      const res = await fetch("/api/think", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, prompt: p }) });
      const d = await res.json().catch(() => ({}));
      setResponse(d.ok ? d.response : d.error || "Couldn't respond — try again.");
    } catch { setResponse("Couldn't reach the thinking room — try again."); }
    finally { setBusy(false); }
  }

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(null), 1800); }

  function turnIntoGoal() {
    const t = prompt.trim(); if (!t) return;
    start(async () => { const r = await addGoalAction({ title: t.slice(0, 100) }); flash(r.ok ? "Added to Goals" : r.error || "Couldn't add goal"); });
  }
  function addToCalendar() {
    const t = prompt.trim(); if (!t) return;
    start(async () => { const r = await addEventAction({ title: t.slice(0, 120), type: "task" }); flash(r.ok ? "Added to today's calendar" : "Couldn't add"); });
  }
  function saveAsNote() {
    const body = `${prompt.trim()}${response ? `\n\n— ${response}` : ""}`;
    if (!body.trim()) return;
    start(async () => { const r = await quickCaptureTask(body.slice(0, 500)); flash(r.ok ? "Saved as a note" : "Couldn't save"); });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-7 md:px-8">
      <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", color: "var(--muted)" }}>A room for hard questions and clear decisions.</div>

      <div className="mt-4 flex flex-wrap gap-2">
        {MODES.map((m) => {
          const on = m.key === mode;
          return (
            <button key={m.key} type="button" onClick={() => setMode(m.key)} className="rounded-full px-3.5 py-1.5 text-[13px] font-medium" style={{ background: on ? "var(--accent)" : "var(--surface)", color: on ? "#F6F1E6" : "var(--ink)", border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`, cursor: "pointer" }}>{m.label}</button>
          );
        })}
      </div>
      <div className="mt-2 text-[12.5px]" style={{ color: "var(--faint)", fontFamily: "var(--mono)", letterSpacing: ".02em" }}>{activeMode.blurb}</div>

      <textarea
        value={prompt} onChange={(e) => setPrompt(e.target.value)}
        placeholder="What are you working through?"
        rows={4}
        className="pz-in mt-4 w-full rounded-[12px] border px-4 py-3 text-[15px] outline-none"
        style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--ink)", fontFamily: "var(--serif)", resize: "vertical" }}
      />
      <button type="button" onClick={() => void think()} disabled={!prompt.trim() || busy} className="mt-3 rounded-[9px] px-5 py-2.5 text-[13.5px] font-semibold disabled:opacity-60" style={{ background: "var(--accent)", color: "#F6F1E6", cursor: "pointer" }}>
        {busy ? "Thinking…" : `Think · ${activeMode.label}`}
      </button>

      {response && (
        <div className="mt-5 rounded-[12px] border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2" style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".12em", color: "var(--faint)" }}>
            <span className="flex" style={{ color: "var(--accent)" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" /></svg></span>
            {activeMode.label.toUpperCase()}
          </div>
          <p className="mt-3 whitespace-pre-wrap text-[14.5px] leading-relaxed">{response}</p>
          <div className="mt-4 flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".12em", color: "var(--faint)" }} className="w-full">SESSION OUTPUTS</span>
            <button type="button" onClick={turnIntoGoal} className="rounded-full border px-3 py-1.5 text-[12.5px]" style={{ borderColor: "var(--border)", cursor: "pointer" }}>Turn into goal</button>
            <button type="button" onClick={addToCalendar} className="rounded-full border px-3 py-1.5 text-[12.5px]" style={{ borderColor: "var(--border)", cursor: "pointer" }}>Add to calendar</button>
            <button type="button" onClick={saveAsNote} className="rounded-full border px-3 py-1.5 text-[12.5px]" style={{ borderColor: "var(--border)", cursor: "pointer" }}>Save as note</button>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-[13px] md:bottom-6" style={{ background: "var(--accent)", color: "#F6F1E6" }}>{toast}</div>}
    </div>
  );
}

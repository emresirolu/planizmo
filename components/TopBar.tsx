"use client";

import { useState, useTransition } from "react";
import { quickCaptureTask } from "@/lib/actions/plan";

function openAssistant() {
  window.dispatchEvent(new Event("planizmo:assistant"));
}

export default function TopBar({
  dateLabel,
  weekday,
}: {
  dateLabel: string;
  weekday: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function capture() {
    const t = text.trim();
    if (!t) return;
    startTransition(async () => {
      const res = await quickCaptureTask(t);
      if (res.ok) {
        setText("");
        setSaved(true);
        setTimeout(() => setSaved(false), 1600);
        setOpen(false);
      }
    });
  }

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b px-4 py-3 md:px-8"
      style={{ background: "var(--bg)", borderColor: "var(--border)" }}
    >
      {/* mobile logo (desktop has the sidebar logo) */}
      <div className="flex items-center gap-2.5 md:invisible">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ background: "var(--accent)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" /></svg>
        </span>
        <span className="text-[15px] font-semibold tracking-tight">planizmo</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white"
          style={{ background: "var(--accent)", cursor: "pointer" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          <span className="hidden sm:inline">Quick capture</span>
        </button>

        <button
          type="button"
          onClick={openAssistant}
          aria-label="Notifications"
          className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border"
          style={{ borderColor: "var(--border)", background: "var(--surface)", cursor: "pointer" }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
        </button>

        <div className="hidden items-center gap-3 sm:flex">
          <div className="text-right">
            <div className="text-sm font-medium">{dateLabel}</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>{weekday}</div>
          </div>
          <div className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg>
          </div>
        </div>
      </div>

      {saved && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-[13px] text-white md:bottom-6" style={{ background: "var(--accent)" }}>
          Captured to your inbox
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-28" role="dialog" aria-modal>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,.34)" }} onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="mb-2 text-sm font-medium">Quick capture</div>
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && capture()}
              placeholder="capture a task or thought…"
              className="pz-in w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border px-3.5 py-2 text-sm" style={{ borderColor: "var(--border)", color: "var(--muted)", cursor: "pointer" }}>Cancel</button>
              <button type="button" disabled={pending || !text.trim()} onClick={capture} className="rounded-xl px-3.5 py-2 text-sm font-medium text-white disabled:opacity-60" style={{ background: "var(--accent)", cursor: "pointer" }}>Capture</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

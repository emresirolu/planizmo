"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { quickCaptureTask } from "@/lib/actions/plan";

export default function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const openIt = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("planizmo:capture", openIt);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("planizmo:capture", openIt);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  function capture() {
    const t = text.trim();
    if (!t) return;
    start(async () => {
      const res = await quickCaptureTask(t);
      if (res.ok) {
        setText("");
        setOpen(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 1600);
      }
    });
  }

  return (
    <>
      {saved && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-[13px] md:bottom-6" style={{ background: "var(--accent)", color: "#F6F1E6" }}>
          Captured to your inbox
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-28" role="dialog" aria-modal>
          <div className="absolute inset-0" style={{ background: "rgba(43,42,38,.4)" }} onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md rounded-[14px] p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 30px 70px rgba(70,55,30,.22)" }}>
            <div className="mb-2 flex items-center gap-2" style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".14em", color: "var(--faint)" }}>QUICK CAPTURE</div>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") capture(); if (e.key === "Escape") setOpen(false); }}
              placeholder="Capture a task, idea, or thought…"
              className="pz-in w-full rounded-[10px] px-3 py-2.5 text-[15px] outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--ink)", fontFamily: "var(--serif)" }}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-[9px] px-3.5 py-2 text-[13px]" style={{ border: "1px solid var(--border)", color: "var(--muted)", cursor: "pointer" }}>Cancel</button>
              <button type="button" disabled={pending || !text.trim()} onClick={capture} className="rounded-[9px] px-3.5 py-2 text-[13px] font-semibold disabled:opacity-60" style={{ background: "var(--accent)", color: "#F6F1E6", cursor: "pointer" }}>Capture</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
type BIPEvent = Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> };

/**
 * Registers the service worker (production only) and shows a calm, dismissible
 * install nudge when the browser offers one — not a popup spammer.
 */
export default function Pwa() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("pz-install-dismissed") === "1") return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem("pz-install-dismissed", "1");
    } catch {}
  }
  function install() {
    deferred?.prompt();
    setShow(false);
  }

  if (!show) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl border p-3 shadow-lg" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl text-white" style={{ background: "var(--accent)" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" /></svg>
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium">Install Planizmo</div>
        <div className="text-[12px]" style={{ color: "var(--muted)" }}>Add it to your home screen for quick access.</div>
      </div>
      <button type="button" onClick={dismiss} className="rounded-lg px-2.5 py-1.5 text-[12.5px]" style={{ color: "var(--muted)", cursor: "pointer" }}>Not now</button>
      <button type="button" onClick={install} className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-white" style={{ background: "var(--accent)", cursor: "pointer" }}>Install</button>
    </div>
  );
}

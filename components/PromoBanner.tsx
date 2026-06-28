"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** Calm, dismissible launch-promo banner. Shown only during the promo window. */
export default function PromoBanner({ until }: { until: string | null }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const key = `pz-promo-dismissed-${until ?? "promo"}`;
    if (localStorage.getItem(key) !== "1") setShow(true);
  }, [until]);

  if (!show) return null;

  function dismiss() {
    try {
      localStorage.setItem(`pz-promo-dismissed-${until ?? "promo"}`, "1");
    } catch {}
    setShow(false);
  }

  return (
    <div
      className="mb-4 flex items-center gap-3 rounded-2xl border px-4 py-3"
      style={{ background: "color-mix(in srgb, var(--accent) 9%, var(--surface))", borderColor: "color-mix(in srgb, var(--accent) 26%, transparent)" }}
    >
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-white" style={{ background: "var(--accent)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" /></svg>
      </span>
      <p className="min-w-0 flex-1 text-[13px] leading-snug">
        You've got <span className="font-medium">Pro free{until ? ` until ${until}` : ""}</span> — everything's unlocked.{" "}
        <Link href="/dashboard/upgrade" className="font-medium" style={{ color: "var(--accent)" }}>Upgrade anytime to keep it →</Link>
      </p>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="flex h-6 w-6 flex-none items-center justify-center rounded-full" style={{ color: "var(--muted)", cursor: "pointer" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

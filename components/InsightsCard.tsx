"use client";

import { useEffect, useState } from "react";

/**
 * Today's control-center insight: a grounded cross-area read ("gym up, screen
 * time creeping") plus a one-tap "what should I do now?" suggestion.
 */
export default function InsightsCard() {
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(true);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/insights", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "insight" }) })
      .then((r) => r.json())
      .then((d) => { if (active && d.ok) setInsight(d.insight); })
      .catch(() => {})
      .finally(() => active && setLoadingInsight(false));
    return () => { active = false; };
  }, []);

  async function whatNow() {
    setLoadingNext(true);
    try {
      const r = await fetch("/api/insights", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "next" }) });
      const d = await r.json();
      if (d.ok) setSuggestion(d.suggestion);
    } catch { /* ignore */ }
    finally { setLoadingNext(false); }
  }

  return (
    <div className="rounded-[16px] border p-4" style={{ background: "var(--surface)", borderColor: "color-mix(in srgb, var(--accent) 26%, var(--border))" }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md" style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" /></svg>
          </span>
          <span className="text-[13.5px] font-semibold">Today’s insight</span>
        </div>
        <button type="button" onClick={whatNow} disabled={loadingNext} className="flex-none rounded-full px-3 py-1.5 text-[12.5px] font-medium text-white disabled:opacity-60" style={{ background: "var(--accent)", cursor: "pointer" }}>
          {loadingNext ? "Thinking…" : "What should I do now?"}
        </button>
      </div>

      {loadingInsight ? (
        <div className="mt-2.5 h-3 w-3/4 rounded" style={{ background: "var(--border)" }} />
      ) : (
        <p className="mt-2 text-[13.5px] leading-relaxed">{insight ?? "Log a few days and I’ll surface what’s trending across your life."}</p>
      )}

      {suggestion && (
        <div className="mt-2.5 rounded-[10px] px-3 py-2 text-[13px] leading-relaxed" style={{ background: "var(--surface2)" }}>
          {suggestion}
        </div>
      )}
    </div>
  );
}

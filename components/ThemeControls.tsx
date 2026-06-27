"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ACCENTS, THEMES, THEME_PREVIEW, type ThemeId } from "@/lib/theme/themes";
import { saveAccent, saveTheme } from "@/lib/actions/profile";
import { can, themeAllowed, type Plan } from "@/lib/billing/plan";

const Lock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export default function ThemeControls({
  initialTheme,
  initialAccent,
  plan = "free",
}: {
  initialTheme: string;
  initialAccent: string;
  plan?: Plan;
}) {
  const router = useRouter();
  const [theme, setTheme] = useState(initialTheme);
  const [accent, setAccent] = useState(initialAccent);
  const [, startTransition] = useTransition();

  const accentLocked = !can(plan, "accent");

  function selectTheme(id: ThemeId) {
    if (id === theme) return;
    if (!themeAllowed(plan, id)) {
      router.push("/dashboard/upgrade");
      return;
    }
    setTheme(id);
    document.documentElement.setAttribute("data-theme", id);
    startTransition(() => void saveTheme(id));
  }

  function selectAccent(color: string) {
    if (accentLocked) {
      router.push("/dashboard/upgrade");
      return;
    }
    if (color.toLowerCase() === accent.toLowerCase()) return;
    setAccent(color);
    document.documentElement.style.setProperty("--accent", color);
    startTransition(() => void saveAccent(color));
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="grid grid-cols-3 gap-2.5">
        {THEMES.map((t) => {
          const selected = t.id === theme;
          const locked = !themeAllowed(plan, t.id);
          const p = THEME_PREVIEW[t.id];
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTheme(t.id)}
              className="relative rounded-[13px] p-1.5 text-center transition-all"
              style={{
                border: selected ? "2px solid var(--accent)" : "2px solid transparent",
                background: selected ? "var(--surface2)" : "transparent",
                cursor: "pointer",
              }}
            >
              <div className="relative h-11 overflow-hidden rounded-[9px]" style={{ background: p.bg, border: `1px solid ${p.border}` }}>
                <div className="absolute" style={{ left: 6, right: 18, bottom: 6, height: 15, borderRadius: 4, background: p.surface, border: `1px solid ${p.border}` }} />
                <div className="absolute" style={{ top: 6, right: 6, width: 13, height: 13, borderRadius: 999, background: p.accent }} />
                {locked && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,.28)", color: "#fff" }}>
                    <Lock />
                  </div>
                )}
              </div>
              <div className="mt-1.5 text-xs">{t.name}</div>
            </button>
          );
        })}
      </div>

      <div className="h-px" style={{ background: "var(--border)" }} />

      <div>
        <div className="mb-3 flex items-center gap-1.5 text-[13px]">
          Accent color
          {accentLocked && <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "var(--surface2)", color: "var(--muted)" }}><Lock /> Pro</span>}
        </div>
        <div className="flex flex-wrap gap-3.5" style={{ opacity: accentLocked ? 0.5 : 1 }}>
          {ACCENTS.map((c) => {
            const selected = c.toLowerCase() === accent.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                aria-label={`Accent ${c}`}
                onClick={() => selectAccent(c)}
                className="transition-all"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  background: c,
                  cursor: "pointer",
                  boxShadow: selected && !accentLocked ? `0 0 0 3px var(--surface), 0 0 0 5px ${c}` : "none",
                }}
              />
            );
          })}
        </div>
      </div>

      {(plan === "free") && (
        <button type="button" onClick={() => router.push("/dashboard/upgrade")} className="self-start text-[12.5px] font-medium" style={{ color: "var(--accent)", cursor: "pointer" }}>
          Unlock all themes + accent with Pro →
        </button>
      )}
    </div>
  );
}

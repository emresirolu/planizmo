"use client";

import { useState, useTransition } from "react";
import {
  ACCENTS,
  THEMES,
  THEME_PREVIEW,
  type ThemeId,
} from "@/lib/theme/themes";
import { saveAccent, saveTheme } from "@/lib/actions/profile";

export default function ThemeControls({
  initialTheme,
  initialAccent,
}: {
  initialTheme: string;
  initialAccent: string;
}) {
  const [theme, setTheme] = useState(initialTheme);
  const [accent, setAccent] = useState(initialAccent);
  const [, startTransition] = useTransition();

  function selectTheme(id: ThemeId) {
    if (id === theme) return;
    setTheme(id); // optimistic
    document.documentElement.setAttribute("data-theme", id); // instant
    startTransition(() => {
      void saveTheme(id); // persist to Neon
    });
  }

  function selectAccent(color: string) {
    if (color.toLowerCase() === accent.toLowerCase()) return;
    setAccent(color); // optimistic
    document.documentElement.style.setProperty("--accent", color); // instant
    startTransition(() => {
      void saveAccent(color); // persist to Neon
    });
  }

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border p-4"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* themes */}
      <div className="grid grid-cols-3 gap-2.5">
        {THEMES.map((t) => {
          const selected = t.id === theme;
          const p = THEME_PREVIEW[t.id];
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTheme(t.id)}
              className="rounded-[13px] p-1.5 text-center transition-all"
              style={{
                border: selected
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
                background: selected ? "var(--surface2)" : "transparent",
                cursor: "pointer",
              }}
            >
              <div
                className="relative h-11 overflow-hidden rounded-[9px]"
                style={{ background: p.bg, border: `1px solid ${p.border}` }}
              >
                <div
                  className="absolute"
                  style={{
                    left: 6,
                    right: 18,
                    bottom: 6,
                    height: 15,
                    borderRadius: 4,
                    background: p.surface,
                    border: `1px solid ${p.border}`,
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    top: 6,
                    right: 6,
                    width: 13,
                    height: 13,
                    borderRadius: 999,
                    background: p.accent,
                  }}
                />
              </div>
              <div className="mt-1.5 text-xs">{t.name}</div>
            </button>
          );
        })}
      </div>

      <div className="h-px" style={{ background: "var(--border)" }} />

      {/* accent */}
      <div>
        <div className="mb-3 text-[13px]">Accent color</div>
        <div className="flex flex-wrap gap-3.5">
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
                  boxShadow: selected
                    ? `0 0 0 3px var(--surface), 0 0 0 5px ${c}`
                    : "none",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import WidgetIcon from "./WidgetIcon";
import {
  MOOD_LABELS,
  interactionMode,
  stepFor,
} from "@/lib/widgets/logic";
import type { ClientWidget, LogState } from "@/lib/widgets/types";

type Props = {
  widget: ClientWidget;
  state: LogState;
  error?: string;
  onToggle: () => void;
  onIncrement: (delta: number) => void;
  onSetMood: (value: number) => void;
  onRemove: () => void;
};

const fmt = (n: number) => n.toLocaleString("en-US");

function metaLabel(w: ClientWidget): string {
  if (w.schedule === "times_per_week" && w.target) return `${w.target}× / week`;
  if (w.schedule === "weekdays") return "weekdays";
  if (w.target) return `goal ${fmt(w.target)}${w.unit ? ` ${w.unit}` : ""}`;
  return "today";
}

function WeekStrip({ completedToday }: { completedToday: boolean }) {
  // Placeholder week strip for wide widgets. History/streaks land in M4 —
  // only today's cell is meaningful for now.
  return (
    <div className="mt-3 flex gap-1.5">
      {Array.from({ length: 7 }).map((_, i) => {
        const isToday = i === 6;
        return (
          <div
            key={i}
            className="h-2 flex-1 rounded-full"
            style={{
              background:
                isToday && completedToday ? "var(--accent)" : "var(--surface2)",
              opacity: isToday ? 1 : 0.6,
            }}
          />
        );
      })}
    </div>
  );
}

export default function WidgetCard({
  widget,
  state,
  error,
  onToggle,
  onIncrement,
  onSetMood,
  onRemove,
}: Props) {
  const mode = interactionMode(widget.type);
  const wide = widget.size === "2x1";
  const value = state.value ?? 0;
  const target = widget.target ?? null;
  const pct =
    target != null
      ? Math.min(100, Math.round((value / target) * 100))
      : state.completed
        ? 100
        : 0;

  return (
    <div
      className={`relative flex flex-col gap-3 rounded-2xl border p-4 ${wide ? "col-span-2" : ""}`}
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 flex-none items-center justify-center rounded-xl"
            style={{
              background: "var(--surface2)",
              color: state.completed ? "var(--accent)" : "var(--text)",
            }}
          >
            <WidgetIcon name={widget.icon} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{widget.title}</div>
            <div className="text-[11px]" style={{ color: "var(--muted)" }}>
              {metaLabel(widget)}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${widget.title}`}
          className="flex h-6 w-6 flex-none items-center justify-center rounded-full transition-opacity hover:opacity-100"
          style={{ color: "var(--muted)", opacity: 0.5, cursor: "pointer" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* body */}
      {mode === "toggle" && (
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors"
          style={{
            background: state.completed
              ? "color-mix(in srgb, var(--accent) 12%, transparent)"
              : "var(--surface2)",
            cursor: "pointer",
          }}
        >
          <span
            className="flex h-7 w-7 flex-none items-center justify-center rounded-full"
            style={{
              background: state.completed ? "var(--accent)" : "transparent",
              border: state.completed ? "none" : "1.5px solid var(--border)",
              color: "#fff",
            }}
          >
            {state.completed && (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </span>
          <span
            className="text-sm"
            style={{
              color: state.completed ? "var(--accent)" : "var(--muted)",
              fontWeight: state.completed ? 500 : 400,
            }}
          >
            {state.completed ? "Done today" : "Tap to log today"}
          </span>
        </button>
      )}

      {mode === "stepper" && (
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => onIncrement(stepFor(widget))}
            className="flex items-baseline gap-1.5 text-left"
            style={{ cursor: "pointer" }}
          >
            <span className={`font-medium tracking-tight ${wide ? "text-3xl" : "text-2xl"}`}>
              {fmt(value)}
            </span>
            {target != null && (
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                / {fmt(target)} {widget.unit}
              </span>
            )}
          </button>

          <div
            className="h-1.5 overflow-hidden rounded-full"
            style={{ background: "var(--surface2)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: "var(--accent)",
                transition: "width .35s ease",
              }}
            />
          </div>

          {wide && <WeekStrip completedToday={state.completed} />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onIncrement(-stepFor(widget))}
              aria-label="Decrease"
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "var(--surface2)", color: "var(--text)", cursor: "pointer" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M5 12h14" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onIncrement(stepFor(widget))}
              aria-label="Increase"
              className="flex h-8 flex-1 items-center justify-center rounded-lg text-white"
              style={{ background: "var(--accent)", cursor: "pointer" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {mode === "scale" && (
        <div className="flex flex-col gap-2.5">
          <div className="text-base font-medium capitalize" style={{ minHeight: 22 }}>
            {state.value ? MOOD_LABELS[state.value - 1] : <span style={{ color: "var(--muted)" }}>How are you?</span>}
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const on = (state.value ?? 0) >= n;
              const sel = state.value === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onSetMood(n)}
                  aria-label={`Mood ${MOOD_LABELS[n - 1]}`}
                  className="rounded-full transition-all"
                  style={{
                    width: sel ? 24 : 18,
                    height: sel ? 24 : 18,
                    background: on ? "var(--accent)" : "var(--surface2)",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="text-[12px]" style={{ color: "var(--alert)" }}>
          {error}
        </div>
      )}
    </div>
  );
}

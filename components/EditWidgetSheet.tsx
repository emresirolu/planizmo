"use client";

import { useState, useTransition } from "react";
import { updateWidgetAction } from "@/lib/actions/widgets";
import type {
  ClientWidget,
  Schedule,
  StreakStats,
  WidgetSize,
} from "@/lib/widgets/types";

type Props = {
  widget: ClientWidget;
  onClose: () => void;
  onSaved: (widget: ClientWidget, streak: StreakStats | null) => void;
};

export default function EditWidgetSheet({ widget, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(widget.title);
  const [target, setTarget] = useState(
    widget.target != null ? String(widget.target) : "",
  );
  const [unit, setUnit] = useState(widget.unit ?? "");
  const [schedule, setSchedule] = useState<Schedule>(widget.schedule);
  const [size, setSize] = useState<WidgetSize>(widget.size);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const usesTarget = !["mood", "tasks", "checklist"].includes(widget.type);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateWidgetAction(widget.id, {
        title,
        ...(usesTarget
          ? { target: target ? Number(target) : null, unit: unit || null }
          : {}),
        schedule,
        size,
      });
      if (res.ok) onSaved(res.widget, res.streak);
      else setError(res.error);
    });
  }

  const inputStyle = {
    background: "var(--surface2)",
    borderColor: "var(--border)",
    color: "var(--text)",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,.34)" }} onClick={onClose} />
      <div
        className="pz-scroll relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border p-5 md:max-w-md md:rounded-3xl"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Edit widget</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: "var(--surface2)", color: "var(--muted)", cursor: "pointer" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-3 text-[13px]" style={{ color: "var(--alert)" }}>{error}</div>
        )}

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px]" style={{ color: "var(--muted)" }}>Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="pz-in w-full rounded-xl border px-3 py-2.5 text-sm outline-none" style={inputStyle} />
          </label>

          {usesTarget && (
            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-[12px]" style={{ color: "var(--muted)" }}>
                  {schedule === "times_per_week" ? "Times / week" : "Target"}
                </span>
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value.replace(/[^0-9]/g, ""))}
                  inputMode="numeric"
                  className="pz-in w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                  style={inputStyle}
                />
              </label>
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-[12px]" style={{ color: "var(--muted)" }}>Unit</span>
                <input value={unit} onChange={(e) => setUnit(e.target.value)} className="pz-in w-full rounded-xl border px-3 py-2.5 text-sm outline-none" style={inputStyle} />
              </label>
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px]" style={{ color: "var(--muted)" }}>Schedule</span>
            <select value={schedule} onChange={(e) => setSchedule(e.target.value as Schedule)} className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none" style={inputStyle}>
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays</option>
              <option value="times_per_week">Times per week</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px]" style={{ color: "var(--muted)" }}>Size</span>
            <select value={size} onChange={(e) => setSize(e.target.value as WidgetSize)} className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none" style={inputStyle}>
              <option value="1x1">Small (1×1)</option>
              <option value="2x1">Wide (2×1)</option>
              <option value="2x2">Large (2×2)</option>
            </select>
          </label>

          <button
            type="button"
            disabled={pending || !title.trim()}
            onClick={save}
            className="mt-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: "var(--accent)", cursor: "pointer" }}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

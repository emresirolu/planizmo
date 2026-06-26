"use client";

import { useState, useTransition } from "react";
import WidgetIcon from "./WidgetIcon";
import { PRESETS } from "@/lib/widgets/catalog";
import { addCustomWidget, addPresetWidget } from "@/lib/actions/widgets";
import type { ClientWidget, Schedule } from "@/lib/widgets/types";

type Props = {
  onClose: () => void;
  onAdded: (widget: ClientWidget) => void;
};

export default function AddWidgetSheet({ onClose, onAdded }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);

  // custom form state
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [target, setTarget] = useState("");
  const [schedule, setSchedule] = useState<Schedule>("daily");

  function addPreset(key: string) {
    setError(null);
    startTransition(async () => {
      const res = await addPresetWidget(key);
      if (res.ok) onAdded(res.widget);
      else setError(res.error);
    });
  }

  function submitCustom() {
    setError(null);
    startTransition(async () => {
      const res = await addCustomWidget({
        title,
        unit,
        target: target ? Number(target) : null,
        schedule,
      });
      if (res.ok) onAdded(res.widget);
      else setError(res.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal>
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,.34)" }}
        onClick={onClose}
      />
      <div
        className="pz-scroll relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border p-5 md:max-w-lg md:rounded-3xl"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">
            {showCustom ? "Custom counter" : "Add a widget"}
          </h2>
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
          <div className="mb-3 text-[13px]" style={{ color: "var(--alert)" }}>
            {error}
          </div>
        )}

        {!showCustom && (
          <div className="flex flex-col gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                disabled={pending}
                onClick={() => (p.custom ? setShowCustom(true) : addPreset(p.key))}
                className="flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors disabled:opacity-60"
                style={{ borderColor: "var(--border)", cursor: "pointer" }}
              >
                <span
                  className="flex h-10 w-10 flex-none items-center justify-center rounded-xl"
                  style={{ background: "var(--surface2)", color: "var(--accent)" }}
                >
                  <WidgetIcon name={p.icon} size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{p.title}</span>
                  <span className="block text-[12px]" style={{ color: "var(--muted)" }}>
                    {p.blurb}
                  </span>
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  {p.custom ? <path d="M9 6l6 6-6 6" /> : <path d="M12 5v14M5 12h14" />}
                </svg>
              </button>
            ))}
          </div>
        )}

        {showCustom && (
          <div className="flex flex-col gap-3">
            <Field label="Title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Pushups"
                className="pz-in w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
              />
            </Field>
            <div className="flex gap-3">
              <Field label="Unit (optional)">
                <input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="reps"
                  className="pz-in w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                  style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
                />
              </Field>
              <Field label="Daily target">
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value.replace(/[^0-9]/g, ""))}
                  inputMode="numeric"
                  placeholder="50"
                  className="pz-in w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                  style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
                />
              </Field>
            </div>
            <Field label="Schedule">
              <select
                value={schedule}
                onChange={(e) => setSchedule(e.target.value as Schedule)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
              >
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays</option>
                <option value="times_per_week">Times per week</option>
              </select>
            </Field>

            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCustom(false)}
                className="rounded-xl border px-4 py-2.5 text-sm"
                style={{ borderColor: "var(--border)", color: "var(--muted)", cursor: "pointer" }}
              >
                Back
              </button>
              <button
                type="button"
                disabled={pending || !title.trim()}
                onClick={submitCustom}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                style={{ background: "var(--accent)", cursor: "pointer" }}
              >
                Add widget
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-1 flex-col gap-1.5">
      <span className="text-[12px]" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

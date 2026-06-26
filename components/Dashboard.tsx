"use client";

import { useEffect, useState, useTransition } from "react";
import CompletionRing from "./CompletionRing";
import WidgetCard from "./WidgetCard";
import AddWidgetSheet from "./AddWidgetSheet";
import { isScheduledToday, nextLogState } from "@/lib/widgets/logic";
import { logWidget, removeWidgetAction } from "@/lib/actions/widgets";
import { saveTimezone } from "@/lib/actions/profile";
import type { ClientWidget, LogOp, LogState } from "@/lib/widgets/types";

type Props = {
  name: string;
  greeting: string;
  dateStr: string;
  profileTimezone: string;
  initialWidgets: ClientWidget[];
  initialLogs: Record<string, LogState>;
};

const EMPTY: LogState = { value: null, completed: false };

export default function Dashboard({
  name,
  greeting,
  dateStr,
  profileTimezone,
  initialWidgets,
  initialLogs,
}: Props) {
  const [widgets, setWidgets] = useState<ClientWidget[]>(initialWidgets);
  const [logs, setLogs] = useState<Record<string, LogState>>(initialLogs);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  // One-time: persist the browser's real timezone so "today" is the user's day.
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== profileTimezone) void saveTimezone(tz);
  }, [profileTimezone]);

  const today = new Date();
  const scheduled = widgets.filter((w) => isScheduledToday(w.schedule, today));
  const completedCount = scheduled.filter(
    (w) => (logs[w.id] ?? EMPTY).completed,
  ).length;

  function stateOf(id: string): LogState {
    return logs[id] ?? EMPTY;
  }

  function persist(widget: ClientWidget, op: LogOp) {
    const prev = stateOf(widget.id);
    const optimistic = nextLogState(widget, prev, op);
    setLogs((s) => ({ ...s, [widget.id]: optimistic }));
    setErrors((s) => {
      const n = { ...s };
      delete n[widget.id];
      return n;
    });
    startTransition(async () => {
      const res = await logWidget(widget.id, op);
      if (res.ok) {
        setLogs((s) => ({ ...s, [widget.id]: res.state }));
      } else {
        setLogs((s) => ({ ...s, [widget.id]: prev })); // rollback
        setErrors((s) => ({ ...s, [widget.id]: res.error }));
      }
    });
  }

  function handleRemove(widget: ClientWidget) {
    const prevWidgets = widgets;
    setWidgets((w) => w.filter((x) => x.id !== widget.id));
    startTransition(async () => {
      const res = await removeWidgetAction(widget.id);
      if (!res.ok) setWidgets(prevWidgets); // rollback
    });
  }

  function handleAdded(widget: ClientWidget) {
    setWidgets((w) => [...w, widget]);
    setAdding(false);
  }

  return (
    <div className="flex flex-col">
      {/* greeting */}
      <div className="px-1 pb-4 pt-1">
        <div className="text-[13px]" style={{ color: "var(--muted)" }}>
          {dateStr}
        </div>
        <h1 className="mt-1 text-3xl font-medium tracking-tight">
          {greeting}, {name}
        </h1>
      </div>

      {/* hero: ring + brief placeholder */}
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="md:w-72 md:flex-none">
          <CompletionRing completed={completedCount} total={scheduled.length} />
        </div>
        <div
          className="flex flex-1 items-center gap-3 rounded-2xl border p-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div
            className="flex h-9 w-9 flex-none items-center justify-center rounded-xl"
            style={{ background: "var(--surface2)", color: "var(--accent)" }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" />
            </svg>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            Your daily brief lands here soon. For now, tap a widget to log it.
          </p>
        </div>
      </div>

      {/* section header */}
      <div className="mx-1 mb-3 mt-6 flex items-center justify-between">
        <span className="text-[13px]" style={{ color: "var(--muted)" }}>
          Today
        </span>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-white"
          style={{ background: "var(--accent)", cursor: "pointer" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add widget
        </button>
      </div>

      {/* grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {widgets.map((w) => (
          <WidgetCard
            key={w.id}
            widget={w}
            state={stateOf(w.id)}
            error={errors[w.id]}
            onToggle={() => persist(w, { kind: "toggle" })}
            onIncrement={(delta) => persist(w, { kind: "increment", delta })}
            onSetMood={(value) => persist(w, { kind: "set", value })}
            onRemove={() => handleRemove(w)}
          />
        ))}

        <button
          type="button"
          onClick={() => setAdding(true)}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed py-10 text-center ${
            widgets.length === 0 ? "col-span-2 md:col-span-3 lg:col-span-4" : ""
          }`}
          style={{ borderColor: "var(--border)", color: "var(--muted)", cursor: "pointer" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="text-sm">
            {widgets.length === 0 ? "Add your first widget" : "Add a widget"}
          </span>
        </button>
      </div>

      {adding && (
        <AddWidgetSheet onClose={() => setAdding(false)} onAdded={handleAdded} />
      )}
    </div>
  );
}

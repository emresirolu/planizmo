"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import WidgetIcon from "./WidgetIcon";
import { useRouter } from "next/navigation";
import { interactionMode, nextLogState, stepFor, MOOD_LABELS } from "@/lib/widgets/logic";
import { categoryForWidgetType, CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/plan/categories";
import { logWidget, toggleTaskAction } from "@/lib/actions/widgets";
import { setViewModeAction } from "@/lib/actions/timeline";
import TimelineView from "./TimelineView";
import HealthSummary from "./HealthSummary";
import GoalsPanel from "./GoalsPanel";
import type { ClientTimeBlock } from "@/lib/plan/timeline";
import type { ClientGoal } from "@/lib/goals/types";
import type { HealthSummary as HealthSummaryData } from "@/lib/db/scoped";
import type { ClientWidget, LogState, StreakStats } from "@/lib/widgets/types";
import { can, type Plan } from "@/lib/billing/plan";

type ViewMode = "flow" | "timeline";

type ChecklistData = { items: { id: string; label: string }[]; checkedToday: string[] };
type Task = { id: string; title: string; dueDate: string | null; completed: boolean; widgetId?: string };

type Props = {
  name: string;
  greeting: string;
  summary: string;
  today: string;
  widgets: ClientWidget[];
  initialLogs: Record<string, LogState>;
  streaks: Record<string, StreakStats>;
  checklists: Record<string, ChecklistData>;
  tasks: Task[];
  initialViewMode: ViewMode;
  timeBlocks: ClientTimeBlock[];
  health: HealthSummaryData;
  goals: ClientGoal[];
  plan: Plan;
};

const EMPTY: LogState = { value: null, completed: false };

export default function TodayView({ name, greeting, summary, today, widgets, initialLogs, streaks, checklists, tasks: initialTasks, initialViewMode, timeBlocks, health, goals, plan }: Props) {
  const router = useRouter();
  const [logs, setLogs] = useState(initialLogs);
  const [tasks, setTasks] = useState(initialTasks);
  const [mode, setMode] = useState<ViewMode>(initialViewMode);
  const [, startTransition] = useTransition();
  const timelineLocked = !can(plan, "timeline_mode");

  function switchMode(next: ViewMode) {
    if (next === mode) return;
    if (next === "timeline" && timelineLocked) {
      router.push("/dashboard/upgrade");
      return;
    }
    setMode(next); // instant + lossless (data is never destroyed)
    startTransition(() => void setViewModeAction(next));
  }

  useEffect(() => {
    const f = () => router.refresh();
    window.addEventListener("planizmo:data-changed", f);
    return () => window.removeEventListener("planizmo:data-changed", f);
  }, [router]);

  function st(id: string) { return logs[id] ?? EMPTY; }

  function log(w: ClientWidget, op: Parameters<typeof nextLogState>[2]) {
    const prev = st(w.id);
    setLogs((s) => ({ ...s, [w.id]: nextLogState(w, prev, op) }));
    startTransition(async () => {
      const res = await logWidget(w.id, op);
      if (res.ok) setLogs((s) => ({ ...s, [w.id]: res.state }));
      else setLogs((s) => ({ ...s, [w.id]: prev }));
    });
  }

  function toggleTask(t: Task) {
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, completed: !x.completed } : x)));
    startTransition(() => void toggleTaskAction(t.id, !t.completed));
  }

  // Build the flow list: scheduled trackable widgets + checklist widgets + tasks due today.
  const trackable = widgets.filter((w) => ["habit", "counter", "health", "reading", "mood"].includes(w.type));
  const checklistWidgets = widgets.filter((w) => w.type === "checklist");
  const dueToday = tasks.filter((t) => !t.completed && t.dueDate === today);

  const isEmpty = trackable.length === 0 && checklistWidgets.length === 0 && dueToday.length === 0;

  function askOptimize() { window.dispatchEvent(new Event("planizmo:assistant")); }

  return (
    <div className="flex flex-col">
      {/* greeting */}
      <div className="mb-6">
        <div className="text-[13px]" style={{ color: "var(--muted)" }}>Today</div>
        <h1 className="mt-1.5 text-[30px] font-medium tracking-tight">{greeting}, {name} 👋</h1>
        <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed" style={{ color: "var(--muted)" }}>{summary}</p>
      </div>

      <div className="grid gap-[18px] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ===== Col 1: Today's plan (Flow) ===== */}
        <section className="rounded-[18px] border p-[18px]" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-base font-semibold tracking-tight">Today's plan</span>
            <div className="flex items-center gap-2">
              <div className="flex rounded-full border p-0.5" style={{ borderColor: "var(--border)", background: "var(--surface2)" }}>
                {(["flow", "timeline"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => switchMode(m)} className="rounded-full px-3 py-1 text-[12px] font-medium capitalize" style={{ background: mode === m ? "var(--accent)" : "transparent", color: mode === m ? "#fff" : "var(--muted)", cursor: "pointer" }}>{m}</button>
                ))}
              </div>
              <button type="button" onClick={askOptimize} className="flex items-center gap-1.5 rounded-full border px-[11px] py-1.5 text-[12.5px] font-medium" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--accent)", cursor: "pointer" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.4 3.9L17 8l-3.6 1.1L12 13l-1.4-3.9L7 8l3.6-1.1z" /></svg>
                Ask AI to optimize
              </button>
            </div>
          </div>

          {mode === "timeline" ? (
            <TimelineView initial={timeBlocks} />
          ) : isEmpty ? (
            <p className="py-6 text-sm" style={{ color: "var(--muted)" }}>
              Nothing scheduled yet. Add habits or lists, or ask the assistant to plan your day.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {trackable.map((w) => (
                <FlowRow key={w.id} widget={w} state={st(w.id)} onLog={(op) => log(w, op)} />
              ))}
              {checklistWidgets.map((w) => {
                const cl = checklists[w.id];
                const total = cl?.items.length ?? 0;
                const done = cl?.checkedToday.length ?? 0;
                return (
                  <Link key={w.id} href="/dashboard/lists" className="flex items-center gap-3 rounded-[13px] border px-[13px] py-2.5" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
                    <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}><WidgetIcon name={w.icon} size={18} /></span>
                    <span className="flex-1 min-w-0"><span className="block truncate text-sm font-medium">{w.title}</span><span className="block text-[12.5px]" style={{ color: "var(--muted)" }}>{done} / {total} done</span></span>
                    <Tag category="planning" />
                  </Link>
                );
              })}
              {dueToday.map((t) => (
                <button key={t.id} type="button" onClick={() => toggleTask(t)} className="flex items-center gap-3 rounded-[13px] border px-[13px] py-2.5 text-left" style={{ background: "var(--surface2)", borderColor: "var(--border)", cursor: "pointer" }}>
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full" style={{ background: t.completed ? "var(--accent)" : "transparent", border: t.completed ? "none" : "1.5px solid var(--border)", color: "#fff" }}>
                    {t.completed && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-sm font-medium" style={{ textDecoration: t.completed ? "line-through" : "none", color: t.completed ? "var(--muted)" : "var(--text)" }}>{t.title}</span>
                  <Tag category="work" label="Task" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-3.5 flex items-center justify-between border-t pt-3.5" style={{ borderColor: "var(--border)" }}>
            <Link href="/dashboard/habits" className="flex items-center gap-1.5 text-[13.5px]" style={{ color: "var(--muted)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              Manage habits
            </Link>
            <Link href="/dashboard/planner" className="flex items-center gap-1.5 text-[13.5px] font-medium" style={{ color: "var(--accent)" }}>
              View full planner
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          </div>
        </section>

        {/* ===== Col 2: middle ===== */}
        <div className="flex flex-col gap-[18px]">
          <NextMove widgets={trackable} logs={logs} dueToday={dueToday} />
          <GoalsPanel goals={goals} />
          <div className="grid gap-[18px] sm:grid-cols-2">
            <HealthSummary summary={health} compact />
            <HabitsPanel widgets={widgets} streaks={streaks} logs={logs} today={today} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Tag({ category, label }: { category: keyof typeof CATEGORY_COLOR; label?: string }) {
  const color = CATEGORY_COLOR[category];
  return (
    <span className="flex-none rounded-full px-2.5 py-1 text-[11.5px] font-medium" style={{ color, background: `color-mix(in srgb, ${color} 13%, transparent)` }}>
      {label ?? CATEGORY_LABEL[category]}
    </span>
  );
}

function FlowRow({ widget, state, onLog }: { widget: ClientWidget; state: LogState; onLog: (op: Parameters<typeof nextLogState>[2]) => void }) {
  const mode = interactionMode(widget.type);
  const cat = categoryForWidgetType(widget.type);
  const value = state.value ?? 0;
  const sub =
    widget.type === "mood"
      ? state.value ? MOOD_LABELS[state.value - 1] : "tap to log mood"
      : widget.target != null
        ? `${value.toLocaleString("en-US")} / ${widget.target.toLocaleString("en-US")}${widget.unit ? ` ${widget.unit}` : ""}`
        : state.completed ? "done today" : "tap to log";

  const onClick = () => {
    if (mode === "toggle") onLog({ kind: "toggle" });
    else if (mode === "stepper") onLog({ kind: "increment", delta: stepFor(widget) });
  };

  return (
    <div className="flex items-center gap-3 rounded-[13px] border px-[13px] py-2.5" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left" style={{ cursor: mode === "scale" ? "default" : "pointer" }} disabled={mode === "scale"}>
        <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] border" style={{ background: "var(--surface)", borderColor: "var(--border)", color: state.completed ? "var(--accent)" : "var(--text)" }}>
          <WidgetIcon name={widget.icon} size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium" style={{ textDecoration: state.completed && mode === "toggle" ? "line-through" : "none", color: state.completed && mode === "toggle" ? "var(--muted)" : "var(--text)" }}>{widget.title}</span>
          <span className="block text-[12.5px] capitalize" style={{ color: "var(--muted)" }}>{sub}</span>
        </span>
      </button>
      {mode === "scale" ? (
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => onLog({ kind: "set", value: n })} aria-label={`mood ${n}`} className="rounded-full" style={{ width: 14, height: 14, background: (state.value ?? 0) >= n ? "var(--accent)" : "var(--surface)", border: "1px solid var(--border)", cursor: "pointer" }} />
          ))}
        </div>
      ) : (
        <Tag category={cat} />
      )}
    </div>
  );
}

function NextMove({ widgets, logs, dueToday }: { widgets: ClientWidget[]; logs: Record<string, LogState>; dueToday: Task[] }) {
  // Grounded only: no widgets/tasks → a calm invite, never invented activity.
  const hasAny = widgets.length > 0 || dueToday.length > 0;
  const w = widgets.find((x) => !(logs[x.id]?.completed));
  const target = !hasAny ? "Add your first widget" : w ? w.title : dueToday[0]?.title ?? null;
  const rationale = !hasAny
    ? "Add a habit or describe a goal and I'll suggest your best next move — grounded in what you're actually tracking."
    : w
      ? "A clear next step keeps your momentum going — knock this out while you're fresh."
      : dueToday[0]
        ? "This is due today — a good moment to clear it."
        : "You're on top of today's plan. A short reflection or a head start on tomorrow would be a strong move.";

  function ask() { window.dispatchEvent(new Event("planizmo:assistant")); }

  return (
    <section className="rounded-[18px] border p-[18px]" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span style={{ color: "var(--accent)" }}><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" /></svg></span>
          <span className="text-[15px] font-semibold tracking-tight">Recommended next move</span>
        </div>
        <span className="text-xs italic" style={{ color: "var(--muted)" }}>Suggested by Planizmo AI</span>
      </div>
      <div className="mt-4 flex gap-4">
        <span className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--success) 15%, transparent)", color: "var(--success)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[19px] font-medium tracking-tight">{target ?? "Plan your day"}</div>
          {/* grounded in real data only — no invented activity */}
          <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: "var(--muted)" }}>{rationale}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2.5">
        <button type="button" onClick={ask} className="rounded-[11px] px-[15px] py-2.5 text-[13.5px] font-medium text-white" style={{ background: "var(--accent)", cursor: "pointer" }}>Ask AI to plan</button>
        <button type="button" onClick={ask} className="rounded-[11px] border px-[15px] py-2.5 text-[13.5px]" style={{ background: "var(--surface2)", borderColor: "var(--border)", cursor: "pointer" }}>Replan my day</button>
      </div>
    </section>
  );
}

function HabitsPanel({ widgets, streaks, logs, today }: { widgets: ClientWidget[]; streaks: Record<string, StreakStats>; logs: Record<string, LogState>; today: string }) {
  const habitish = widgets.filter((w) => ["habit", "counter", "reading", "checklist", "health"].includes(w.type)).slice(0, 4);
  return (
    <section className="rounded-[18px] border p-[18px]" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-[14.5px] font-semibold">Habits</span>
        <Link href="/dashboard/habits" className="text-[12.5px] font-medium" style={{ color: "var(--accent)" }}>Full stats</Link>
      </div>
      {habitish.length === 0 ? (
        <p className="text-[13px]" style={{ color: "var(--muted)" }}>No habits yet.</p>
      ) : (
        <div className="flex flex-col gap-3.5">
          {habitish.map((w) => {
            const s = streaks[w.id];
            const cur = s?.currentStreak ?? 0;
            const strength = s?.strength ?? 0;
            return (
              <div key={w.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><div className="truncate text-[13px] font-medium">{w.title}</div><div className="text-[11px]" style={{ color: "var(--muted)" }}>{strength}% strength</div></div>
                  <span className="flex-none whitespace-nowrap text-[11px] font-medium" style={{ color: "var(--success)" }}>{cur} day{cur === 1 ? "" : "s"}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full" style={{ background: "var(--surface2)" }}>
                  <div className="h-full rounded-full" style={{ width: `${strength}%`, background: "var(--success)" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}


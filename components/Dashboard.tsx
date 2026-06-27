"use client";

import { useEffect, useState, useTransition } from "react";
import CompletionRing from "./CompletionRing";
import WidgetCard, { type WidgetHandlers } from "./WidgetCard";
import AddWidgetSheet from "./AddWidgetSheet";
import EditWidgetSheet from "./EditWidgetSheet";
import ArrangeGrid from "./ArrangeGrid";
import { useRouter } from "next/navigation";
import { can, type Plan } from "@/lib/billing/plan";
import { isScheduledToday, nextLogState } from "@/lib/widgets/logic";
import {
  isStreakType,
  type ChecklistItem,
  type ClientWidget,
  type HeatCell,
  type LogOp,
  type LogState,
  type StreakStats,
  type Task,
  type WidgetSize,
} from "@/lib/widgets/types";
import {
  addChecklistItemAction,
  addTaskAction,
  deleteTaskAction,
  logWidget,
  removeChecklistItemAction,
  removeWidgetAction,
  renameChecklistItemAction,
  reorderWidgetsAction,
  resizeWidgetAction,
  toggleChecklistItemAction,
  toggleTaskAction,
  updateTaskAction,
} from "@/lib/actions/widgets";
import { saveTimezone } from "@/lib/actions/profile";

type ChecklistState = { items: ChecklistItem[]; checked: Set<string> };

type Props = {
  name: string;
  greeting: string;
  dateStr: string;
  today: string;
  profileTimezone: string;
  initialWidgets: ClientWidget[];
  initialLogs: Record<string, LogState>;
  initialStreaks: Record<string, StreakStats>;
  initialHeatmaps: Record<string, HeatCell[]>;
  initialChecklists: Record<string, { items: ChecklistItem[]; checkedToday: string[] }>;
  initialTasks: Record<string, Task[]>;
  /** When set, renders a plain heading instead of the greeting/ring hero. */
  heading?: string;
  /** When set, only widgets of these types are shown (full management board). */
  filterKinds?: string[];
  plan?: Plan;
};

const EMPTY: LogState = { value: null, completed: false };

export default function Dashboard(props: Props) {
  const { name, greeting, dateStr, today, profileTimezone, heading, filterKinds, plan = "free" } = props;
  const router = useRouter();
  const canCustomize = can(plan, "customization");

  const [widgets, setWidgets] = useState<ClientWidget[]>(props.initialWidgets);
  const [logs, setLogs] = useState<Record<string, LogState>>(props.initialLogs);
  const [streaks, setStreaks] = useState<Record<string, StreakStats>>(props.initialStreaks);
  const [heatmaps, setHeatmaps] = useState<Record<string, HeatCell[]>>(props.initialHeatmaps);
  const [checklists, setChecklists] = useState<Record<string, ChecklistState>>(() => {
    const out: Record<string, ChecklistState> = {};
    for (const [id, c] of Object.entries(props.initialChecklists)) {
      out[id] = { items: c.items, checked: new Set(c.checkedToday) };
    }
    return out;
  });
  const [tasks, setTasks] = useState<Record<string, Task[]>>(props.initialTasks);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ClientWidget | null>(null);
  const [arranging, setArranging] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== profileTimezone) void saveTimezone(tz);
  }, [profileTimezone]);

  // ----- overview ring: today's scheduled, completable widgets (not tasks) -----
  const asOfDate = new Date(`${today}T00:00:00Z`);
  const ringWidgets = widgets.filter(
    (w) => w.type !== "tasks" && isScheduledToday(w.schedule, asOfDate),
  );
  const completedCount = ringWidgets.filter((w) => (logs[w.id] ?? EMPTY).completed).length;

  const visibleWidgets = filterKinds ? widgets.filter((w) => filterKinds.includes(w.type)) : widgets;

  function stateOf(id: string): LogState {
    return logs[id] ?? EMPTY;
  }
  function setError(id: string, msg: string | undefined) {
    setErrors((s) => {
      const n = { ...s };
      if (msg) n[id] = msg;
      else delete n[id];
      return n;
    });
  }
  function bumpHeat(id: string, completed: boolean) {
    setHeatmaps((s) => {
      const cells = s[id];
      if (!cells || cells.length === 0) return s;
      const copy = cells.slice();
      copy[copy.length - 1] = { ...copy[copy.length - 1], level: completed ? 4 : 1 };
      return { ...s, [id]: copy };
    });
  }

  // ----- one-tap logging -----
  function persist(widget: ClientWidget, op: LogOp) {
    const prev = stateOf(widget.id);
    const optimistic = nextLogState(widget, prev, op);
    setLogs((s) => ({ ...s, [widget.id]: optimistic }));
    bumpHeat(widget.id, optimistic.completed);
    setError(widget.id, undefined);
    startTransition(async () => {
      const res = await logWidget(widget.id, op);
      if (res.ok) {
        setLogs((s) => ({ ...s, [widget.id]: res.state }));
        bumpHeat(widget.id, res.state.completed);
        if (res.streak) setStreaks((s) => ({ ...s, [widget.id]: res.streak! }));
      } else {
        setLogs((s) => ({ ...s, [widget.id]: prev }));
        bumpHeat(widget.id, prev.completed);
        setError(widget.id, res.error);
      }
    });
  }

  // ----- checklist -----
  function checklistComplete(id: string, checked: Set<string>): boolean {
    const items = checklists[id]?.items ?? [];
    return items.length > 0 && items.every((it) => checked.has(it.id));
  }

  function toggleChecklist(widget: ClientWidget, itemId: string, on: boolean) {
    const prevCl = checklists[widget.id];
    if (!prevCl) return;
    const nextChecked = new Set(prevCl.checked);
    if (on) nextChecked.add(itemId);
    else nextChecked.delete(itemId);
    const complete = checklistComplete(widget.id, nextChecked);

    setChecklists((s) => ({ ...s, [widget.id]: { ...prevCl, checked: nextChecked } }));
    setLogs((s) => ({ ...s, [widget.id]: { value: nextChecked.size, completed: complete } }));
    bumpHeat(widget.id, complete);
    setError(widget.id, undefined);

    startTransition(async () => {
      const res = await toggleChecklistItemAction(itemId, on);
      if (res.ok) {
        if (res.streak) setStreaks((s) => ({ ...s, [widget.id]: res.streak! }));
      } else {
        setChecklists((s) => ({ ...s, [widget.id]: prevCl }));
        const back = checklistComplete(widget.id, prevCl.checked);
        setLogs((s) => ({ ...s, [widget.id]: { value: prevCl.checked.size, completed: back } }));
        bumpHeat(widget.id, back);
        setError(widget.id, res.error);
      }
    });
  }

  function addChecklistItem(widget: ClientWidget, label: string) {
    startTransition(async () => {
      const res = await addChecklistItemAction(widget.id, label);
      if (res.ok) {
        setChecklists((s) => {
          const cur = s[widget.id] ?? { items: [], checked: new Set<string>() };
          return { ...s, [widget.id]: { ...cur, items: [...cur.items, res.item] } };
        });
        // adding an item un-completes the day
        setLogs((s) => ({ ...s, [widget.id]: { ...(s[widget.id] ?? EMPTY), completed: false } }));
      } else setError(widget.id, res.error);
    });
  }
  function renameChecklistItem(widget: ClientWidget, itemId: string, label: string) {
    setChecklists((s) => {
      const cur = s[widget.id];
      if (!cur) return s;
      return {
        ...s,
        [widget.id]: { ...cur, items: cur.items.map((it) => (it.id === itemId ? { ...it, label } : it)) },
      };
    });
    startTransition(() => void renameChecklistItemAction(itemId, label));
  }
  function removeChecklistItem(widget: ClientWidget, itemId: string) {
    setChecklists((s) => {
      const cur = s[widget.id];
      if (!cur) return s;
      const checked = new Set(cur.checked);
      checked.delete(itemId);
      return { ...s, [widget.id]: { items: cur.items.filter((it) => it.id !== itemId), checked } };
    });
    startTransition(() => void removeChecklistItemAction(itemId));
  }

  // ----- tasks -----
  function addTask(widget: ClientWidget, title: string, dueDate: string | null) {
    startTransition(async () => {
      const res = await addTaskAction({ widgetId: widget.id, title, dueDate });
      if (res.ok)
        setTasks((s) => ({ ...s, [widget.id]: [...(s[widget.id] ?? []), res.task] }));
      else setError(widget.id, res.error);
    });
  }
  function toggleTask(widget: ClientWidget, taskId: string, completed: boolean) {
    setTasks((s) => ({
      ...s,
      [widget.id]: (s[widget.id] ?? []).map((t) => (t.id === taskId ? { ...t, completed } : t)),
    }));
    startTransition(() => void toggleTaskAction(taskId, completed));
  }
  function renameTask(widget: ClientWidget, taskId: string, title: string) {
    setTasks((s) => ({
      ...s,
      [widget.id]: (s[widget.id] ?? []).map((t) => (t.id === taskId ? { ...t, title } : t)),
    }));
    startTransition(() => void updateTaskAction(taskId, { title }));
  }
  function deleteTask(widget: ClientWidget, taskId: string) {
    setTasks((s) => ({ ...s, [widget.id]: (s[widget.id] ?? []).filter((t) => t.id !== taskId) }));
    startTransition(() => void deleteTaskAction(taskId));
  }

  // ----- widget lifecycle -----
  function handleRemove(widget: ClientWidget) {
    const prev = widgets;
    setWidgets((w) => w.filter((x) => x.id !== widget.id));
    startTransition(async () => {
      const res = await removeWidgetAction(widget.id);
      if (!res.ok) setWidgets(prev);
    });
  }
  // arrange mode: reorder the visible subset, preserving hidden widgets' slots
  function handleReorder(orderedVisibleIds: string[]) {
    const visible = new Set(orderedVisibleIds);
    const queue = [...orderedVisibleIds];
    const fullIds = widgets.map((w) => (visible.has(w.id) ? (queue.shift() as string) : w.id));
    const byId = new Map(widgets.map((w) => [w.id, w]));
    setWidgets(fullIds.map((id) => byId.get(id) as ClientWidget));
    startTransition(() => void reorderWidgetsAction(fullIds));
  }
  function handleResize(id: string, size: WidgetSize) {
    setWidgets((w) => w.map((x) => (x.id === id ? { ...x, size } : x)));
    startTransition(() => void resizeWidgetAction(id, size));
  }
  function removeById(id: string) {
    const w = widgets.find((x) => x.id === id);
    if (w) handleRemove(w);
  }

  function handleAdded(widget: ClientWidget) {
    setWidgets((w) => [...w, widget]);
    if (widget.type === "checklist")
      setChecklists((s) => ({ ...s, [widget.id]: { items: [], checked: new Set() } }));
    if (widget.type === "tasks") setTasks((s) => ({ ...s, [widget.id]: [] }));
    if (isStreakType(widget.type)) {
      setStreaks((s) => ({ ...s, [widget.id]: { currentStreak: 0, longestStreak: 0, strength: 0 } }));
      setHeatmaps((s) => ({ ...s, [widget.id]: [] }));
    }
    setAdding(false);
  }
  function handleSaved(widget: ClientWidget, streak: StreakStats | null) {
    setWidgets((w) => w.map((x) => (x.id === widget.id ? widget : x)));
    if (streak) setStreaks((s) => ({ ...s, [widget.id]: streak }));
    setEditing(null);
  }

  function handlersFor(widget: ClientWidget): WidgetHandlers {
    return {
      onToggle: () => persist(widget, { kind: "toggle" }),
      onIncrement: (delta) => persist(widget, { kind: "increment", delta }),
      onSetMood: (value) => persist(widget, { kind: "set", value }),
      onEdit: () => setEditing(widget),
      onRemove: () => handleRemove(widget),
      onChecklistToggle: (itemId, checked) => toggleChecklist(widget, itemId, checked),
      onChecklistAdd: (label) => addChecklistItem(widget, label),
      onChecklistRename: (itemId, label) => renameChecklistItem(widget, itemId, label),
      onChecklistRemove: (itemId) => removeChecklistItem(widget, itemId),
      onTaskAdd: (title, dueDate) => addTask(widget, title, dueDate),
      onTaskToggle: (taskId, completed) => toggleTask(widget, taskId, completed),
      onTaskRename: (taskId, title) => renameTask(widget, taskId, title),
      onTaskDelete: (taskId) => deleteTask(widget, taskId),
    };
  }

  return (
    <div className="flex flex-col">
      {heading ? (
        <div className="mb-5 flex items-center justify-between gap-2">
          <h1 className="text-[28px] font-medium tracking-tight">{heading}</h1>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => (canCustomize ? setArranging((v) => !v) : router.push("/dashboard/upgrade"))} className="flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium" style={{ borderColor: arranging ? "var(--accent)" : "var(--border)", color: arranging ? "var(--accent)" : "var(--muted)", background: arranging ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent", cursor: "pointer" }}>
              {canCustomize ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l-2 3 2 3M19 9l2 3-2 3M9 5l3-2 3 2M9 19l3 2 3-2" /></svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
              )}
              {arranging ? "Done" : "Arrange"}
            </button>
            <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium text-white" style={{ background: "var(--accent)", cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              Add widget
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="px-1 pb-4 pt-1">
            <div className="text-[13px]" style={{ color: "var(--muted)" }}>{dateStr}</div>
            <h1 className="mt-1 text-3xl font-medium tracking-tight">{greeting}, {name}</h1>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="md:w-72 md:flex-none">
              <CompletionRing completed={completedCount} total={ringWidgets.length} />
            </div>
            <div className="mx-1 mb-3 mt-6 flex items-center justify-between md:hidden">
              <span className="text-[13px]" style={{ color: "var(--muted)" }}>Today</span>
            </div>
          </div>
          <div className="mb-3 mt-6 flex items-center justify-end">
            <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-white" style={{ background: "var(--accent)", cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              Add widget
            </button>
          </div>
        </>
      )}

      {arranging ? (
        <>
          <p className="mb-3 text-[13px]" style={{ color: "var(--muted)" }}>
            Drag the handle to reorder · tap “resize” to cycle small / wide / large. Changes save automatically.
          </p>
          <ArrangeGrid widgets={visibleWidgets} onReorder={handleReorder} onResize={handleResize} onRemove={removeById} />
        </>
      ) : (
      <div
        className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4"
        style={{ gridAutoRows: "minmax(9rem, auto)" }}
      >
        {visibleWidgets.map((w) => (
          <WidgetCard
            key={w.id}
            widget={w}
            today={today}
            state={stateOf(w.id)}
            error={errors[w.id]}
            streak={streaks[w.id]}
            heatcells={heatmaps[w.id]}
            checklist={checklists[w.id]}
            tasks={tasks[w.id]}
            h={handlersFor(w)}
          />
        ))}

        <button
          type="button"
          onClick={() => setAdding(true)}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed py-10 text-center ${visibleWidgets.length === 0 ? "col-span-2 md:col-span-3 lg:col-span-4" : ""}`}
          style={{ borderColor: "var(--border)", color: "var(--muted)", cursor: "pointer" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          <span className="text-sm">{visibleWidgets.length === 0 ? "Add your first widget" : "Add a widget"}</span>
        </button>
      </div>
      )}

      {adding && <AddWidgetSheet onClose={() => setAdding(false)} onAdded={handleAdded} />}
      {editing && <EditWidgetSheet widget={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
    </div>
  );
}

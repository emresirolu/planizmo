"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addEventAction,
  deleteEventAction,
  setHabitDoneAction,
  toggleEventCompleteAction,
  updateEventAction,
} from "@/lib/actions/calendar";
import { fmtTime, TYPE_COLORS, type CalEventType, type ClientEvent } from "@/lib/calendar/types";

type View = "month" | "week" | "day";
type Habit = { id: string; title: string; schedule: "daily" | "weekdays" | "times_per_week" };

/* ---------- date helpers (UTC, string-based to avoid tz drift) ---------- */
function parse(s: string): Date { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); }
function ymd(dt: Date): string { return dt.toISOString().slice(0, 10); }
function addD(s: string, n: number): string { const dt = parse(s); dt.setUTCDate(dt.getUTCDate() + n); return ymd(dt); }
function dow(s: string): number { return parse(s).getUTCDay(); } // 0 Sun .. 6 Sat
function mondayOf(s: string): string { const d = dow(s); return addD(s, d === 0 ? -6 : 1 - d); }
function monthGrid(focus: string): string[] {
  const d = parse(focus); const first = ymd(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
  const start = mondayOf(first);
  return Array.from({ length: 42 }, (_, i) => addD(start, i));
}
function sameMonth(a: string, b: string): boolean { return a.slice(0, 7) === b.slice(0, 7); }
const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function habitOnDay(schedule: Habit["schedule"], date: string): boolean {
  if (schedule === "daily") return true;
  if (schedule === "weekdays") { const d = dow(date); return d >= 1 && d <= 5; }
  return false; // times_per_week is flexible — logged via trackers, not pinned to a day
}

export default function CalendarTab({
  events,
  habits,
  completedHabitKeys,
  today,
  focus,
  view,
}: {
  events: ClientEvent[];
  habits: Habit[];
  completedHabitKeys: string[];
  today: string;
  focus: string;
  view: View;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<ClientEvent | null>(null);
  const [creatingDate, setCreatingDate] = useState<string | null>(null);

  const doneSet = useMemo(() => new Set(completedHabitKeys), [completedHabitKeys]);
  const eventsByDay = useMemo(() => {
    const m = new Map<string, ClientEvent[]>();
    for (const e of events) { const a = m.get(e.date) ?? []; a.push(e); m.set(e.date, a); }
    return m;
  }, [events]);

  function go(v: View, d: string) { router.push(`/dashboard/calendar?v=${v}&d=${d}`); }
  function nav(delta: number) {
    if (view === "month") { const d = parse(focus); go("month", ymd(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1)))); }
    else go(view, addD(focus, view === "week" ? delta * 7 : delta));
  }

  const label = useMemo(() => {
    const d = parse(focus);
    if (view === "month") return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
    if (view === "day") return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
    const ws = mondayOf(focus); const we = addD(ws, 6);
    const f = (s: string) => parse(s).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    return `${f(ws)} – ${f(we)}`;
  }, [focus, view]);

  function refresh() { router.refresh(); }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-medium tracking-tight">Calendar</h1>
        <div className="flex items-center gap-1.5">
          {(["month", "week", "day"] as View[]).map((v) => (
            <button key={v} type="button" onClick={() => go(v, focus)} className="rounded-full px-3 py-1.5 text-[12.5px] font-medium capitalize"
              style={{ background: v === view ? "var(--accent)" : "var(--surface2)", color: v === view ? "#fff" : "var(--text)", cursor: "pointer" }}>{v}</button>
          ))}
        </div>
      </div>

      <JarvisBar focus={focus} onDone={refresh} />

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => nav(-1)} aria-label="Previous" className="rounded-lg border px-2 py-1 text-[13px]" style={{ borderColor: "var(--border)", cursor: "pointer" }}>←</button>
          <button type="button" onClick={() => go(view, today)} className="rounded-lg border px-2.5 py-1 text-[12.5px]" style={{ borderColor: "var(--border)", cursor: "pointer" }}>Today</button>
          <button type="button" onClick={() => nav(1)} aria-label="Next" className="rounded-lg border px-2 py-1 text-[13px]" style={{ borderColor: "var(--border)", cursor: "pointer" }}>→</button>
          <span className="ml-1 text-[15px] font-medium">{label}</span>
        </div>
        <button type="button" onClick={() => setCreatingDate(view === "day" ? focus : today)} className="rounded-full px-3.5 py-1.5 text-[13px] font-medium text-white" style={{ background: "var(--accent)", cursor: "pointer" }}>+ New</button>
      </div>

      <div className="mt-4">
        {view === "month" && (
          <MonthView focus={focus} today={today} eventsByDay={eventsByDay} onDay={(d) => go("day", d)} />
        )}
        {view === "week" && (
          <WeekView focus={focus} today={today} eventsByDay={eventsByDay} habits={habits} doneSet={doneSet}
            onEvent={setEditing} onAdd={(d) => setCreatingDate(d)} onToggleEvent={(e) => start(async () => { await toggleEventCompleteAction(e.id, !e.completed); refresh(); })}
            onToggleHabit={(hid, d, c) => start(async () => { await setHabitDoneAction(hid, d, c); refresh(); })} />
        )}
        {view === "day" && (
          <DayView date={focus} today={today} events={eventsByDay.get(focus) ?? []} habits={habits} doneSet={doneSet}
            onEvent={setEditing} onToggleEvent={(e) => start(async () => { await toggleEventCompleteAction(e.id, !e.completed); refresh(); })}
            onToggleHabit={(hid, d, c) => start(async () => { await setHabitDoneAction(hid, d, c); refresh(); })} />
        )}
      </div>

      {creatingDate && <EventModal mode="create" initialDate={creatingDate} onClose={() => setCreatingDate(null)} onSaved={() => { setCreatingDate(null); refresh(); }} />}
      {editing && <EventModal mode="edit" event={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} onDeleted={() => { setEditing(null); refresh(); }} />}

      {pending && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full px-3 py-1.5 text-[12px] text-white md:bottom-6" style={{ background: "var(--accent)" }}>saving…</div>}
    </div>
  );
}

/* ---------------- Jarvis ---------------- */

function JarvisBar({ focus, onDone }: { focus: string; onDone: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function plan() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/calendar/plan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t, windowStart: focus }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) { setMsg(`Added ${d.count} ${d.count === 1 ? "item" : "items"} to your calendar.`); setText(""); onDone(); }
      else setMsg(d.error || "Couldn't build that plan — try again.");
    } catch { setMsg("Couldn't reach the planner — try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="mt-4 rounded-[14px] border p-2" style={{ background: "var(--surface)", borderColor: "color-mix(in srgb, var(--accent) 30%, var(--border))" }}>
      <div className="flex items-center gap-2 rounded-[10px] px-3 py-1.5" style={{ background: "var(--surface2)" }}>
        <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md" style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" /></svg>
        </span>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void plan(); } }}
          placeholder='Plan it for me — e.g. "gym 5×, study for exam Tue/Thu evenings, call mom Sunday"'
          className="pz-in min-w-0 flex-1 border-none bg-transparent text-[13.5px] outline-none" style={{ color: "var(--text)" }} />
        <button type="button" onClick={() => void plan()} disabled={!text.trim() || busy} className="flex-none rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium text-white disabled:opacity-50" style={{ background: "var(--accent)", cursor: "pointer" }}>
          {busy ? "Planning…" : "Build plan"}
        </button>
      </div>
      {msg && <div className="px-2 pt-1.5 text-[12px]" style={{ color: "var(--muted)" }}>{msg}</div>}
    </div>
  );
}

/* ---------------- Month ---------------- */

function MonthView({ focus, today, eventsByDay, onDay }: { focus: string; today: string; eventsByDay: Map<string, ClientEvent[]>; onDay: (d: string) => void }) {
  const days = monthGrid(focus);
  return (
    <div className="overflow-hidden rounded-[16px] border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="grid grid-cols-7 border-b" style={{ borderColor: "var(--border)" }}>
        {WD.map((w) => <div key={w} className="px-2 py-2 text-center text-[11px] font-medium" style={{ color: "var(--muted)" }}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const evs = eventsByDay.get(d) ?? [];
          const dim = !sameMonth(d, focus);
          const isToday = d === today;
          return (
            <button key={d} type="button" onClick={() => onDay(d)} className="flex min-h-[84px] flex-col items-stretch gap-1 border-b border-r p-1.5 text-left"
              style={{ borderColor: "var(--border)", background: isToday ? "color-mix(in srgb, var(--accent) 7%, transparent)" : "transparent", cursor: "pointer", opacity: dim ? 0.45 : 1 }}>
              <span className="text-[12px] font-medium" style={{ color: isToday ? "var(--accent)" : "var(--text)" }}>{Number(d.slice(8))}</span>
              {evs.slice(0, 3).map((e) => (
                <span key={e.id} className="truncate rounded px-1 py-0.5 text-[10.5px]" style={{ background: `color-mix(in srgb, ${TYPE_COLORS[e.type]} 18%, transparent)`, color: TYPE_COLORS[e.type], textDecoration: e.completed ? "line-through" : "none" }}>
                  {e.startTime ? `${fmtTime(e.startTime)} ` : ""}{e.title}
                </span>
              ))}
              {evs.length > 3 && <span className="text-[10px]" style={{ color: "var(--muted)" }}>+{evs.length - 3} more</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Week ---------------- */

function WeekView({
  focus, today, eventsByDay, habits, doneSet, onEvent, onAdd, onToggleEvent, onToggleHabit,
}: {
  focus: string; today: string; eventsByDay: Map<string, ClientEvent[]>; habits: Habit[]; doneSet: Set<string>;
  onEvent: (e: ClientEvent) => void; onAdd: (d: string) => void; onToggleEvent: (e: ClientEvent) => void; onToggleHabit: (hid: string, date: string, c: boolean) => void;
}) {
  const ws = mondayOf(focus);
  const days = Array.from({ length: 7 }, (_, i) => addD(ws, i));
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
      {days.map((d) => (
        <div key={d} className="rounded-[12px] border p-2" style={{ borderColor: "var(--border)", background: d === today ? "color-mix(in srgb, var(--accent) 7%, transparent)" : "var(--surface)" }}>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[12px] font-medium">{WD[(dow(d) + 6) % 7]} {Number(d.slice(8))}</span>
            <button type="button" onClick={() => onAdd(d)} aria-label="Add" className="text-[14px] leading-none" style={{ color: "var(--muted)", cursor: "pointer" }}>+</button>
          </div>
          <DayItems date={d} events={eventsByDay.get(d) ?? []} habits={habits} doneSet={doneSet} compact onEvent={onEvent} onToggleEvent={onToggleEvent} onToggleHabit={onToggleHabit} />
        </div>
      ))}
    </div>
  );
}

/* ---------------- Day ---------------- */

function DayView({
  date, today, events, habits, doneSet, onEvent, onToggleEvent, onToggleHabit,
}: {
  date: string; today: string; events: ClientEvent[]; habits: Habit[]; doneSet: Set<string>;
  onEvent: (e: ClientEvent) => void; onToggleEvent: (e: ClientEvent) => void; onToggleHabit: (hid: string, date: string, c: boolean) => void;
}) {
  const dayHabits = habits.filter((h) => habitOnDay(h.schedule, date));
  const plannedTotal = events.length + dayHabits.length;
  const doneTotal = events.filter((e) => e.completed).length + dayHabits.filter((h) => doneSet.has(`${h.id}|${date}`)).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-[14px] border p-3.5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-semibold">Planned vs. done</span>
          <span className="text-[13px]" style={{ color: "var(--muted)" }}>{doneTotal} / {plannedTotal || 0} done</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: "var(--surface2)" }}>
          <div className="h-full rounded-full" style={{ width: `${plannedTotal ? (doneTotal / plannedTotal) * 100 : 0}%`, background: "var(--success, #3fb984)" }} />
        </div>
      </div>
      <div className="rounded-[14px] border p-3.5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <DayItems date={date} events={events} habits={habits} doneSet={doneSet} onEvent={onEvent} onToggleEvent={onToggleEvent} onToggleHabit={onToggleHabit} />
      </div>
    </div>
  );
}

/* ---------------- shared day item list ---------------- */

function DayItems({
  date, events, habits, doneSet, compact, onEvent, onToggleEvent, onToggleHabit,
}: {
  date: string; events: ClientEvent[]; habits: Habit[]; doneSet: Set<string>; compact?: boolean;
  onEvent: (e: ClientEvent) => void; onToggleEvent: (e: ClientEvent) => void; onToggleHabit: (hid: string, date: string, c: boolean) => void;
}) {
  const dayHabits = habits.filter((h) => habitOnDay(h.schedule, date));
  if (events.length === 0 && dayHabits.length === 0) {
    return <div className="py-2 text-center text-[12px]" style={{ color: "var(--muted)" }}>Nothing scheduled.</div>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      {events.map((e) => (
        <div key={e.id} className="flex items-center gap-2 rounded-[9px] px-2 py-1.5" style={{ background: `color-mix(in srgb, ${TYPE_COLORS[e.type]} 12%, transparent)` }}>
          <button type="button" onClick={() => onToggleEvent(e)} aria-label="Toggle complete" className="flex h-4 w-4 flex-none items-center justify-center rounded-[5px] border" style={{ borderColor: TYPE_COLORS[e.type], background: e.completed ? TYPE_COLORS[e.type] : "transparent", cursor: "pointer" }}>
            {e.completed && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
          </button>
          <button type="button" onClick={() => onEvent(e)} className="min-w-0 flex-1 text-left" style={{ cursor: "pointer" }}>
            <span className="block truncate text-[12.5px]" style={{ textDecoration: e.completed ? "line-through" : "none", color: "var(--text)" }}>{e.title}</span>
            {(e.startTime || e.source === "ai") && (
              <span className="text-[10.5px]" style={{ color: "var(--muted)" }}>
                {e.startTime ? `${fmtTime(e.startTime)}${e.endTime ? `–${fmtTime(e.endTime)}` : ""}` : ""}{e.source === "ai" ? `${e.startTime ? " · " : ""}AI` : ""}
              </span>
            )}
          </button>
        </div>
      ))}
      {!compact && dayHabits.length > 0 && events.length > 0 && <div className="mt-1 text-[10.5px] font-medium" style={{ color: "var(--muted)" }}>Habits</div>}
      {dayHabits.map((h) => {
        const done = doneSet.has(`${h.id}|${date}`);
        return (
          <button key={h.id} type="button" onClick={() => onToggleHabit(h.id, date, !done)} className="flex items-center gap-2 rounded-[9px] px-2 py-1.5 text-left" style={{ background: "color-mix(in srgb, #3fb984 10%, transparent)", cursor: "pointer" }}>
            <span className="flex h-4 w-4 flex-none items-center justify-center rounded-full border" style={{ borderColor: "#3fb984", background: done ? "#3fb984" : "transparent" }}>
              {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
            </span>
            <span className="truncate text-[12.5px]" style={{ textDecoration: done ? "line-through" : "none" }}>{h.title}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- create / edit modal ---------------- */

const TYPES: CalEventType[] = ["event", "block", "task", "habit"];

function EventModal({
  mode, event, initialDate, onClose, onSaved, onDeleted,
}: {
  mode: "create" | "edit"; event?: ClientEvent; initialDate?: string; onClose: () => void; onSaved: () => void; onDeleted?: () => void;
}) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(event?.date ?? initialDate ?? "");
  const [startTime, setStartTime] = useState(event?.startTime ?? "");
  const [endTime, setEndTime] = useState(event?.endTime ?? "");
  const [type, setType] = useState<CalEventType>(event?.type ?? "event");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setErr(null);
    start(async () => {
      if (mode === "create") {
        const res = await addEventAction({ title, date, startTime: startTime || null, endTime: endTime || null, type });
        if (res.ok) onSaved(); else setErr(res.error);
      } else if (event) {
        const res = await updateEventAction(event.id, { title, date, startTime: startTime || null, endTime: endTime || null, type });
        if (res.ok) onSaved(); else setErr(res.error ?? "Couldn't save.");
      }
    });
  }
  function del() { if (event) start(async () => { await deleteEventAction(event.id); onDeleted?.(); }); }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24" role="dialog" aria-modal>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,.34)" }} onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="mb-3 text-[15px] font-semibold">{mode === "create" ? "New item" : "Edit item"}</div>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
          className="pz-in mb-2.5 w-full rounded-lg border px-3 py-2 text-[14px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} />
        <div className="grid grid-cols-3 gap-2">
          <label className="col-span-3 flex flex-col gap-1"><span className="text-[11.5px]" style={{ color: "var(--muted)" }}>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pz-in rounded-lg border px-2.5 py-2 text-[13.5px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} /></label>
          <label className="flex flex-col gap-1"><span className="text-[11.5px]" style={{ color: "var(--muted)" }}>Start</span>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="pz-in rounded-lg border px-2 py-2 text-[13.5px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} /></label>
          <label className="flex flex-col gap-1"><span className="text-[11.5px]" style={{ color: "var(--muted)" }}>End</span>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="pz-in rounded-lg border px-2 py-2 text-[13.5px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} /></label>
          <label className="flex flex-col gap-1"><span className="text-[11.5px]" style={{ color: "var(--muted)" }}>Type</span>
            <select value={type} onChange={(e) => setType(e.target.value as CalEventType)} className="pz-in rounded-lg border px-2 py-2 text-[13.5px] capitalize outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select></label>
        </div>
        {err && <div className="mt-2 text-[12.5px]" style={{ color: "#d4544f" }}>{err}</div>}
        <div className="mt-4 flex items-center justify-between">
          {mode === "edit" ? <button type="button" onClick={del} className="text-[12.5px]" style={{ color: "#d4544f", cursor: "pointer" }}>Delete</button> : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-3.5 py-2 text-[13px]" style={{ borderColor: "var(--border)", color: "var(--muted)", cursor: "pointer" }}>Cancel</button>
            <button type="button" disabled={pending || !title.trim() || !date} onClick={save} className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-white disabled:opacity-60" style={{ background: "var(--accent)", cursor: "pointer" }}>{pending ? "Saving…" : "Save"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

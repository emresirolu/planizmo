"use client";

import { useState } from "react";
import DatePicker from "./DatePicker";
import type { Task } from "@/lib/widgets/types";

type Props = {
  tasks: Task[];
  today: string;
  onAdd: (title: string, dueDate: string | null) => void;
  onToggle: (taskId: string, completed: boolean) => void;
  onRename: (taskId: string, title: string) => void;
  onDelete: (taskId: string) => void;
};

function dueChip(due: string | null, today: string, completed: boolean) {
  if (!due) return null;
  const overdue = !completed && due < today;
  const isToday = due === today;
  const bg = overdue
    ? "color-mix(in srgb, var(--alert) 16%, transparent)"
    : isToday
      ? "color-mix(in srgb, var(--accent) 14%, transparent)"
      : "var(--surface2)";
  const color = overdue ? "var(--alert)" : isToday ? "var(--accent)" : "var(--muted)";
  const label = overdue
    ? `overdue · ${due.slice(5)}`
    : isToday
      ? "today"
      : due.slice(5);
  return (
    <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: bg, color }}>
      {label}
    </span>
  );
}

export default function TasksBody({
  tasks,
  today,
  onAdd,
  onToggle,
  onRename,
  onDelete,
}: Props) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // open tasks sorted: overdue → today → upcoming → no date; completed last.
  const open = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);
  const rank = (t: Task) => {
    if (!t.dueDate) return 3;
    if (t.dueDate < today) return 0;
    if (t.dueDate === today) return 1;
    return 2;
  };
  open.sort((a, b) => rank(a) - rank(b) || (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9"));

  function submitAdd() {
    const v = title.trim();
    if (!v) return;
    onAdd(v, due);
    setTitle("");
    setDue(null);
  }
  function commitRename(id: string) {
    const v = editTitle.trim();
    if (v) onRename(id, v);
    setEditing(null);
  }

  function Row({ t }: { t: Task }) {
    const overdue = !t.completed && t.dueDate && t.dueDate < today;
    return (
      <div
        className="flex items-center gap-2.5 rounded-lg px-1 py-1.5"
        style={overdue ? { background: "color-mix(in srgb, var(--alert) 7%, transparent)" } : undefined}
      >
        <button
          type="button"
          onClick={() => onToggle(t.id, !t.completed)}
          aria-label={t.completed ? "Mark incomplete" : "Complete"}
          className="flex h-5 w-5 flex-none items-center justify-center rounded-full"
          style={{
            background: t.completed ? "var(--accent)" : "transparent",
            border: t.completed ? "none" : "1.5px solid var(--border)",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {t.completed && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </button>

        {editing === t.id ? (
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={() => commitRename(t.id)}
            onKeyDown={(e) => e.key === "Enter" && commitRename(t.id)}
            className="pz-in flex-1 rounded-md border px-2 py-1 text-sm outline-none"
            style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditing(t.id);
              setEditTitle(t.title);
            }}
            className="flex-1 truncate text-left text-sm"
            style={{
              textDecoration: t.completed ? "line-through" : "none",
              color: t.completed ? "var(--muted)" : "var(--text)",
              cursor: "text",
            }}
          >
            {t.title}
          </button>
        )}

        {dueChip(t.dueDate, today, t.completed)}

        <button
          type="button"
          onClick={() => onDelete(t.id)}
          aria-label="Delete task"
          className="flex h-6 w-6 flex-none items-center justify-center rounded-full"
          style={{ color: "var(--muted)", opacity: 0.5, cursor: "pointer" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        {open.map((t) => (
          <Row key={t.id} t={t} />
        ))}
        {done.map((t) => (
          <Row key={t.id} t={t} />
        ))}
        {tasks.length === 0 && (
          <div className="py-2 text-[13px]" style={{ color: "var(--muted)" }}>
            No tasks yet.
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitAdd()}
          placeholder="Add a task"
          className="pz-in min-w-0 flex-1 rounded-lg border px-2.5 py-1.5 text-sm outline-none"
          style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
        />
        <DatePicker value={due} onChange={setDue} todayIso={today} placeholder="Due date" />
        <button
          type="button"
          onClick={submitAdd}
          className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-white"
          style={{ background: "var(--accent)", cursor: "pointer" }}
          aria-label="Add task"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
}

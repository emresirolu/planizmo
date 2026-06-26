"use client";

import { useState } from "react";
import type { ChecklistItem } from "@/lib/widgets/types";

type Props = {
  items: ChecklistItem[];
  checked: Set<string>;
  onToggle: (itemId: string, checked: boolean) => void;
  onAdd: (label: string) => void;
  onRename: (itemId: string, label: string) => void;
  onRemove: (itemId: string) => void;
};

export default function ChecklistBody({
  items,
  checked,
  onToggle,
  onAdd,
  onRename,
  onRemove,
}: Props) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const done = items.filter((it) => checked.has(it.id)).length;

  function submitAdd() {
    const v = draft.trim();
    if (!v) return;
    onAdd(v);
    setDraft("");
  }
  function commitRename(id: string) {
    const v = editLabel.trim();
    if (v) onRename(id, v);
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-[13px]" style={{ color: "var(--muted)" }}>
        {items.length === 0 ? "Add items below" : `${done} / ${items.length} done today`}
      </div>

      <div className="flex flex-col gap-1">
        {items.map((it) => {
          const on = checked.has(it.id);
          return (
            <div key={it.id} className="flex items-center gap-2.5 rounded-lg px-1 py-1">
              <button
                type="button"
                onClick={() => onToggle(it.id, !on)}
                aria-label={on ? "Uncheck" : "Check"}
                className="flex h-5 w-5 flex-none items-center justify-center rounded-md"
                style={{
                  background: on ? "var(--accent)" : "transparent",
                  border: on ? "none" : "1.5px solid var(--border)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {on && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>

              {editing === it.id ? (
                <input
                  autoFocus
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onBlur={() => commitRename(it.id)}
                  onKeyDown={(e) => e.key === "Enter" && commitRename(it.id)}
                  className="pz-in flex-1 rounded-md border px-2 py-1 text-sm outline-none"
                  style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(it.id);
                    setEditLabel(it.label);
                  }}
                  className="flex-1 text-left text-sm"
                  style={{
                    textDecoration: on ? "line-through" : "none",
                    color: on ? "var(--muted)" : "var(--text)",
                    cursor: "text",
                  }}
                >
                  {it.label}
                </button>
              )}

              <button
                type="button"
                onClick={() => onRemove(it.id)}
                aria-label="Remove item"
                className="flex h-6 w-6 flex-none items-center justify-center rounded-full"
                style={{ color: "var(--muted)", opacity: 0.5, cursor: "pointer" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitAdd()}
          placeholder="Add an item"
          className="pz-in flex-1 rounded-lg border px-2.5 py-1.5 text-sm outline-none"
          style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
        />
        <button
          type="button"
          onClick={submitAdd}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
          style={{ background: "var(--accent)", cursor: "pointer" }}
          aria-label="Add item"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
}

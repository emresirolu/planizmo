"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import WidgetIcon from "./WidgetIcon";
import type { ClientWidget, WidgetSize } from "@/lib/widgets/types";

const SIZES: WidgetSize[] = ["1x1", "2x1", "2x2"];
const SIZE_LABEL: Record<WidgetSize, string> = { "1x1": "Small", "2x1": "Wide", "2x2": "Large" };
function nextSize(s: WidgetSize): WidgetSize {
  return SIZES[(SIZES.indexOf(s) + 1) % SIZES.length];
}
function spanClass(size: WidgetSize): string {
  if (size === "2x2") return "col-span-2 md:row-span-2";
  if (size === "2x1") return "col-span-2";
  return "";
}

function Tile({
  widget,
  onResize,
  onRemove,
}: {
  widget: ClientWidget;
  onResize: (id: string, size: WidgetSize) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1 }}
      className={`flex flex-col gap-2 rounded-2xl border p-4 ${spanClass(widget.size)}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
            className="flex h-7 w-7 flex-none cursor-grab items-center justify-center rounded-lg active:cursor-grabbing"
            style={{ background: "var(--surface2)", color: "var(--muted)", touchAction: "none" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" /></svg>
          </button>
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl" style={{ background: "var(--surface2)", color: "var(--text)" }}>
            <WidgetIcon name={widget.icon} />
          </span>
          <span className="truncate text-sm font-medium">{widget.title}</span>
        </div>
        <button
          type="button"
          onClick={() => onRemove(widget.id)}
          aria-label="Remove"
          className="flex h-6 w-6 flex-none items-center justify-center rounded-full"
          style={{ color: "var(--muted)", cursor: "pointer" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <button
        type="button"
        onClick={() => onResize(widget.id, nextSize(widget.size))}
        className="mt-auto self-start rounded-full border px-2.5 py-1 text-[12px] font-medium"
        style={{ borderColor: "var(--border)", color: "var(--accent)", background: "var(--surface2)", cursor: "pointer" }}
      >
        {SIZE_LABEL[widget.size]} · resize
      </button>
    </div>
  );
}

export default function ArrangeGrid({
  widgets,
  onReorder,
  onResize,
  onRemove,
}: {
  widgets: ClientWidget[];
  onReorder: (orderedIds: string[]) => void;
  onResize: (id: string, size: WidgetSize) => void;
  onRemove: (id: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const ids = widgets.map((w) => w.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (over && active.id !== over.id) {
          const oldI = ids.indexOf(String(active.id));
          const newI = ids.indexOf(String(over.id));
          if (oldI >= 0 && newI >= 0) onReorder(arrayMove(ids, oldI, newI));
        }
      }}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" style={{ gridAutoRows: "minmax(7rem, auto)" }}>
          {widgets.map((w) => (
            <Tile key={w.id} widget={w} onResize={onResize} onRemove={onRemove} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

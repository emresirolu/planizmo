import "server-only";
import {
  addChecklistItem,
  addTimeBlock,
  addWidget,
  clearTimeBlocks,
  getMyTimezone,
  getMyViewMode,
  listMyWidgets,
  listStreaks,
  listTasks,
  setWidgetPositions,
} from "@/lib/db/scoped";
import { callDeepSeek, hasDeepSeekKey, type ChatMsg } from "@/lib/assistant/deepseek";
import { isCategory, categoryForWidgetType, type Category } from "@/lib/plan/categories";
import { todayInTimeZone } from "@/lib/widgets/date";
import { isScheduledToday } from "@/lib/widgets/logic";

export type ActionResult = { reply: string; refresh: boolean };

const norm = (s: string) => s.trim().toLowerCase();

type DayItem = { title: string; type: string; widgetId: string; category: Category };

/** Gather today's schedulable, grounded items (with ids kept server-side). */
async function todayItems() {
  const tz = await getMyTimezone();
  const today = todayInTimeZone(tz);
  const asOf = new Date(`${today}T00:00:00Z`);
  const widgets = await listMyWidgets();
  const tasks = await listTasks();

  const items: DayItem[] = widgets
    .filter((w) => w.type !== "tasks" && isScheduledToday(w.schedule, asOf))
    .map((w) => ({ title: w.title, type: w.type, widgetId: w.id, category: categoryForWidgetType(w.type) }));

  const dueTasks = tasks
    .filter((t) => !t.completed && t.dueDate === today)
    .map((t) => ({ title: t.title, type: "task", widgetId: "", category: "work" as Category }));

  return { today, items, dueTasks };
}

type Block = { title: string; start: string; duration: number; category: Category };

function fallbackSchedule(items: DayItem[], dueTasks: { title: string }[], anchor?: string): Block[] {
  const all = [...items.map((i) => ({ title: i.title, category: i.category })), ...dueTasks.map((t) => ({ title: t.title, category: "work" as Category }))];
  // anchored item first (if named), then the rest
  if (anchor) {
    const idx = all.findIndex((a) => norm(a.title).includes(norm(anchor)));
    if (idx > 0) all.unshift(all.splice(idx, 1)[0]);
  }
  let minutes = 9 * 60;
  return all.slice(0, 10).map((a) => {
    const start = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    minutes += 75; // 60m block + 15m gap
    return { title: a.title, start, duration: 60, category: a.category };
  });
}

async function aiSchedule(items: DayItem[], dueTasks: { title: string }[], message: string): Promise<Block[] | null> {
  if (!hasDeepSeekKey()) return null;
  const ctx = {
    habits: items.map((i) => ({ title: i.title, type: i.type, suggested_category: i.category })),
    tasks_due_today: dueTasks.map((t) => t.title),
  };
  const system = `You are Planizmo's day planner. Build a realistic single-day schedule ONLY from the items in the context — never invent items. Honor any anchor the user names (keep it at its time). Spread items sensibly from morning on, leave small gaps, don't overload. Categories: focus, break, personal, work, health, planning.
Output ONLY JSON: {"blocks":[{"title":"...","start":"HH:MM","duration":<minutes>,"category":"focus"}]}. Titles must match context items.`;
  const messages: ChatMsg[] = [
    { role: "system", content: system },
    { role: "user", content: `Context:\n${JSON.stringify(ctx)}\n\nRequest: ${message}\n\nReturn the schedule JSON.` },
  ];
  try {
    const raw = await callDeepSeek(messages, 900, { json: true, timeoutMs: 25_000 });
    const parsed = JSON.parse(raw) as { blocks?: unknown[] };
    if (!Array.isArray(parsed.blocks)) return null;
    return parsed.blocks
      .map((b) => b as Record<string, unknown>)
      .filter((b) => typeof b.title === "string" && typeof b.start === "string" && /^\d{2}:\d{2}$/.test(b.start as string))
      .slice(0, 12)
      .map((b) => ({
        title: String(b.title).slice(0, 120),
        start: b.start as string,
        duration: Number.isFinite(Number(b.duration)) ? Math.max(15, Math.min(240, Number(b.duration))) : 60,
        category: isCategory(String(b.category)) ? (b.category as Category) : "focus",
      }));
  } catch {
    return null;
  }
}

/** "Plan my day" / "Replan around X" — builds the active view mode. */
export async function runPlanDay(message: string, isReplan: boolean): Promise<ActionResult> {
  const { today, items, dueTasks } = await todayItems();
  if (items.length === 0 && dueTasks.length === 0) {
    return { reply: "Your day is open — there are no habits or tasks for me to arrange yet. Add a few and I'll lay them out.", refresh: false };
  }

  const anchorMatch = /around\s+([a-z0-9 ]{2,30})/i.exec(message);
  const anchor = anchorMatch ? anchorMatch[1].trim() : undefined;

  const blocks = (await aiSchedule(items, dueTasks, message)) ?? fallbackSchedule(items, dueTasks, anchor);
  const widgetByTitle = new Map(items.map((i) => [norm(i.title), i.widgetId]));
  const mode = await getMyViewMode();

  if (mode === "timeline") {
    await clearTimeBlocks(today);
    let pos = 0;
    for (const b of blocks) {
      await addTimeBlock({
        date: today,
        startTime: b.start,
        durationMin: b.duration,
        title: b.title,
        category: b.category,
        sourceWidgetId: widgetByTitle.get(norm(b.title)) ?? null,
      });
      pos++;
    }
    const anchorNote = anchor ? ` I kept ${anchor} fixed and arranged the rest around it.` : "";
    return { reply: `Done — I laid out ${blocks.length} blocks on your timeline starting this morning.${anchorNote} Tweak any of them and they'll save.`, refresh: true };
  }

  // flow: reorder the day's widgets to match the suggested sequence
  const ordered: string[] = [];
  for (const b of blocks) {
    const id = widgetByTitle.get(norm(b.title));
    if (id && !ordered.includes(id)) ordered.push(id);
  }
  for (const i of items) if (!ordered.includes(i.widgetId)) ordered.push(i.widgetId);
  if (ordered.length > 0) await setWidgetPositions(ordered);

  const seq = blocks.map((b) => b.title).slice(0, 6).join(" → ");
  const anchorNote = anchor ? ` ${anchor} stays put.` : "";
  return { reply: `Here's a good order for today: ${seq}.${anchorNote} I've reordered your day to match.`, refresh: true };
}

/** "What should I do next?" — a grounded recommendation, no writes. */
export async function runNextMove(): Promise<ActionResult> {
  const { items, dueTasks } = await todayItems();
  const streaks = await listStreaks();
  const strongest = streaks.sort((a, b) => Number(b.strength) - Number(a.strength))[0];

  const pick = items[0]?.title ?? dueTasks[0]?.title;
  if (!pick) return { reply: "You're clear for today — nothing scheduled. A short reflection or a head start on tomorrow would be a strong move.", refresh: false };

  if (hasDeepSeekKey()) {
    try {
      const reply = await callDeepSeek(
        [
          { role: "system", content: "You are Planizmo's assistant. In 1–2 warm sentences recommend the single best next action from the provided items and say why, grounded only in the data. No invented numbers." },
          { role: "user", content: `Items today: ${JSON.stringify(items.map((i) => i.title))}. Tasks due: ${JSON.stringify(dueTasks.map((t) => t.title))}. Strongest habit strength: ${strongest ? Math.round(Number(strongest.strength)) + "%" : "n/a"}. Recommend the next move.` },
        ],
        160,
      );
      return { reply, refresh: false };
    } catch {
      /* fall through */
    }
  }
  return { reply: `I'd do "${pick}" next — it's on today's plan and knocking it out early builds momentum for the rest of the day.`, refresh: false };
}

/** "Build a list" — create a real checklist from the conversation. */
export async function runBuildList(message: string): Promise<ActionResult> {
  let title = "Grocery list";
  let labels: string[] = [];

  if (hasDeepSeekKey()) {
    try {
      const raw = await callDeepSeek(
        [
          { role: "system", content: `Extract a concise checklist from the user's request. Output ONLY JSON: {"title":"...","items":["...","..."]}. Keep items short. If it's a grocery request, list sensible specific items.` },
          { role: "user", content: message },
        ],
        400,
        { json: true, timeoutMs: 20_000 },
      );
      const parsed = JSON.parse(raw) as { title?: string; items?: unknown[] };
      if (typeof parsed.title === "string" && parsed.title.trim()) title = parsed.title.trim().slice(0, 60);
      if (Array.isArray(parsed.items)) labels = parsed.items.filter((x) => typeof x === "string").map((x) => (x as string).slice(0, 80)).slice(0, 25);
    } catch {
      /* fall through to fallback */
    }
  }
  if (labels.length === 0) {
    // grounded-but-empty fallback: make the list, let the user fill it
    labels = [];
  }

  const widget = await addWidget({
    type: "checklist",
    title,
    icon: "checklist",
    schedule: "daily",
    target: null,
    unit: null,
    size: "2x2",
  });
  for (const label of labels) await addChecklistItem(widget.id, label);

  const reply =
    labels.length > 0
      ? `Created "${title}" with ${labels.length} item${labels.length === 1 ? "" : "s"} — it's in your Lists, ready to check off.`
      : `Created an empty "${title}" in your Lists — add items there or tell me what to put on it.`;
  return { reply, refresh: true };
}

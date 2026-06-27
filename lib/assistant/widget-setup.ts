import "server-only";
import { callDeepSeek, hasDeepSeekKey } from "@/lib/assistant/deepseek";
import type { Schedule, WidgetSize, WidgetType } from "@/lib/widgets/types";

export type WidgetSpec = {
  type: WidgetType;
  title: string;
  icon: string;
  schedule: Schedule;
  target: number | null;
  unit: string | null;
  size: WidgetSize;
};

const TYPES: WidgetType[] = ["habit", "counter", "mood", "health", "reading", "checklist", "tasks"];
const SCHEDULES: Schedule[] = ["daily", "weekdays", "times_per_week"];
const ICONS = ["water", "gym", "sleep", "steps", "mood", "reading", "checklist", "tasks", "counter"];

function iconForType(type: WidgetType): string {
  switch (type) {
    case "habit": return "gym";
    case "mood": return "mood";
    case "reading": return "reading";
    case "health": return "steps";
    case "checklist": return "checklist";
    case "tasks": return "tasks";
    default: return "counter";
  }
}

/** Keyword heuristic used when DeepSeek is unavailable. */
function heuristic(description: string): WidgetSpec {
  const d = description.toLowerCase();
  const title = description.trim().replace(/^(add|create|track|a|an|the)\s+/i, "").slice(0, 40) || "New widget";
  const cap = title.charAt(0).toUpperCase() + title.slice(1);
  if (/water|hydrat|glass/.test(d)) return { type: "counter", title: "Water", icon: "water", schedule: "daily", target: 8, unit: "glasses", size: "1x1" };
  if (/gym|workout|exercise|lift|train/.test(d)) return { type: "habit", title: cap, icon: "gym", schedule: "times_per_week", target: 4, unit: null, size: "1x1" };
  if (/sleep/.test(d)) return { type: "health", title: "Sleep", icon: "sleep", schedule: "daily", target: 8, unit: "hours", size: "2x1" };
  if (/step|walk/.test(d)) return { type: "health", title: "Steps", icon: "steps", schedule: "daily", target: 8000, unit: "steps", size: "2x1" };
  if (/read|book|page/.test(d)) return { type: "reading", title: cap, icon: "reading", schedule: "daily", target: 20, unit: "pages", size: "1x1" };
  if (/mood|feel/.test(d)) return { type: "mood", title: "Mood", icon: "mood", schedule: "daily", target: null, unit: null, size: "1x1" };
  if (/checklist|routine|morning|evening/.test(d)) return { type: "checklist", title: cap, icon: "checklist", schedule: "daily", target: null, unit: null, size: "2x2" };
  if (/task|todo|to-do/.test(d)) return { type: "tasks", title: cap, icon: "tasks", schedule: "daily", target: null, unit: null, size: "2x2" };
  return { type: "counter", title: cap, icon: "counter", schedule: "daily", target: null, unit: null, size: "1x1" };
}

export async function parseWidgetSpec(description: string): Promise<WidgetSpec> {
  if (!hasDeepSeekKey()) return heuristic(description);
  try {
    const raw = await callDeepSeek(
      [
        {
          role: "system",
          content: `Turn a short description into a Planizmo widget spec. Output ONLY JSON: {"type":"habit|counter|mood|health|reading|checklist|tasks","title":"...","schedule":"daily|weekdays|times_per_week","target":<number or null>,"unit":"<short or null>","size":"1x1|2x1|2x2"}. Pick the most fitting type. counters/reading have a numeric target+unit; habits use times_per_week with a weekly count; mood/checklist/tasks have null target. Keep title short.`,
        },
        { role: "user", content: description.slice(0, 200) },
      ],
      200,
      { json: true, timeoutMs: 18_000 },
    );
    const p = JSON.parse(raw) as Record<string, unknown>;
    const type = TYPES.includes(p.type as WidgetType) ? (p.type as WidgetType) : "counter";
    const schedule = SCHEDULES.includes(p.schedule as Schedule) ? (p.schedule as Schedule) : "daily";
    const size = ["1x1", "2x1", "2x2"].includes(p.size as string) ? (p.size as WidgetSize) : "1x1";
    const target = p.target != null && Number.isFinite(Number(p.target)) && Number(p.target) > 0 ? Math.round(Number(p.target)) : null;
    return {
      type,
      title: String(p.title ?? description).trim().slice(0, 40) || "New widget",
      icon: ICONS.includes(p.icon as string) ? (p.icon as string) : iconForType(type),
      schedule,
      target: ["mood", "checklist", "tasks"].includes(type) ? null : target,
      unit: typeof p.unit === "string" ? p.unit.slice(0, 20) || null : null,
      size,
    };
  } catch {
    return heuristic(description);
  }
}

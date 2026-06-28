import "server-only";

import { callDeepSeek, hasDeepSeekKey, type ChatMsg } from "./deepseek";
import type { Widget } from "@/lib/db/scoped";
import type { WidgetType } from "@/lib/widgets/types";

/**
 * Talk-to-log: turn a plain-language sentence ("hit the gym, 180g protein,
 * 3h screen time, weighed 78kg") into structured updates to the user's
 * trackers. The sentence + the user's tracker list are sent to DeepSeek with a
 * strict JSON-output prompt; we then validate every returned id against the
 * user's own widgets so the model can never address a tracker that isn't theirs.
 *
 * Phase 2 targets the existing trackers (widgets/logs). Gym body-metrics and
 * calendar items become additional parse targets in Phases 3 and 5.
 */

/** A tracker as described to the model (no DB internals leak to the prompt). */
type TrackerForPrompt = {
  id: string;
  title: string;
  type: WidgetType;
  unit: string | null;
  target: number | null;
};

/** One update the model proposes, after server-side validation. */
export type ParsedItem = {
  widgetId: string;
  /** Numeric value for counters/health/reading/mood; null for binary habits. */
  value: number | null;
  /** Whether this completes a binary habit (true) — numeric items derive this. */
  completeBinary: boolean;
  /** Model's confidence the phrase maps to this tracker & value. */
  confidence: "high" | "low";
  /** Why it's uncertain or flagged (shown when we ask the user to confirm). */
  reason: string | null;
};

export type ParseResult = {
  items: ParsedItem[];
  unmatched: string[];
  /** True when no model was available (key missing) — caller shows a hint. */
  noModel?: boolean;
};

const SYSTEM = `You convert a person's plain-language log of what they did today into structured updates to THEIR OWN trackers.

You are given a JSON array "trackers", each: {id, title, type, unit, target}.
- type "habit": a yes/no thing (e.g. "gym", "meditate"). It is either done or not — no number.
- type "mood": rate 1-5 (1 rough, 5 great).
- type "counter"/"health"/"reading": a number in the tracker's unit (e.g. protein in g, steps, sleep in hours).

Return ONLY this JSON object:
{
  "matches": [
    { "id": "<one of the given tracker ids>", "value": <number or null>, "confidence": "high" | "low", "reason": "<short, or empty>" }
  ],
  "unmatched": [ "<phrase you could not confidently map to a tracker>" ]
}

Rules:
- Only use ids from the given trackers. Never invent an id, tracker, or number.
- For a habit, set value to null (its presence means "done"). For mood, value is 1-5. For numeric trackers, value is the number in the tracker's unit (convert if the user used a different unit, e.g. "2k steps" -> 2000; "an hour and a half" -> 1.5 for an hours unit).
- confidence "high" only when both the tracker AND the value are unambiguous. Use "low" (with a short reason) when you guessed which tracker, converted an unclear unit, or the value seems unusual.
- If a phrase doesn't clearly map to any tracker, put the phrase in "unmatched" rather than forcing a match.
- Output the JSON object only — no prose, no code fences.`;

/** Plausible-range check per tracker, so a fat-fingered/odd value gets confirmed. */
export function sanityReason(
  w: Pick<TrackerForPrompt, "title" | "type" | "unit" | "target">,
  value: number | null,
): string | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) return "that value didn't look like a number";
  if (value < 0) return "that's a negative value";

  const u = (w.unit ?? "").toLowerCase();
  const t = w.title.toLowerCase();
  const between = (lo: number, hi: number, label: string) =>
    value < lo || value > hi ? `${label} usually falls between ${lo} and ${hi} ${w.unit ?? ""}`.trim() : null;

  if (w.type === "mood") return value >= 1 && value <= 5 ? null : "mood is rated 1–5";
  if (u === "hours" || /sleep|screen/.test(t)) return between(0, 24, "this");
  if (u === "g" || /protein/.test(t)) return between(0, 500, "this");
  if (/cal/.test(u) || /calorie/.test(t)) return between(0, 12000, "this");
  if (u === "steps" || /steps/.test(t)) return between(0, 120000, "this");
  if (/kg/.test(u) || (/weigh|weight/.test(t) && !/lb/.test(u))) return between(20, 400, "weight");
  if (/lb/.test(u)) return between(40, 880, "weight");
  if (/glass|cup|ml|water/.test(u + t)) return value > 10000 ? "that's a lot of water" : null;

  // Generic guard: way past a defined target reads as a likely typo.
  if (w.target != null && w.target > 0 && value > w.target * 6)
    return `that's well above your target of ${w.target}${w.unit ? " " + w.unit : ""}`;
  if (w.target == null && value > 1_000_000) return "that value looks too large";
  return null;
}

type RawMatch = { id?: unknown; value?: unknown; confidence?: unknown; reason?: unknown };

export async function parseTalkToLog(
  text: string,
  widgets: Widget[],
): Promise<ParseResult> {
  // Only trackers we can log against (lists/tasks have their own surfaces).
  const loggable = widgets.filter(
    (w) => w.type === "habit" || w.type === "mood" || w.type === "counter" || w.type === "health" || w.type === "reading",
  );
  if (loggable.length === 0) return { items: [], unmatched: [] };
  if (!hasDeepSeekKey()) return { items: [], unmatched: [], noModel: true };

  const trackers: TrackerForPrompt[] = loggable.map((w) => ({
    id: w.id,
    title: w.title,
    type: w.type,
    unit: w.unit ?? null,
    target: w.target ?? null,
  }));
  const byId = new Map(loggable.map((w) => [w.id, w]));

  const messages: ChatMsg[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: JSON.stringify({ trackers, sentence: text.slice(0, 600) }) },
  ];

  let raw: string;
  try {
    raw = await callDeepSeek(messages, 500, { json: true, timeoutMs: 15_000 });
  } catch {
    return { items: [], unmatched: [], noModel: true };
  }

  let parsed: { matches?: RawMatch[]; unmatched?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { items: [], unmatched: [] };
  }

  const items: ParsedItem[] = [];
  const unmatched: string[] = Array.isArray(parsed.unmatched)
    ? parsed.unmatched.filter((x): x is string => typeof x === "string").slice(0, 12)
    : [];

  const seen = new Set<string>();
  for (const m of Array.isArray(parsed.matches) ? parsed.matches : []) {
    const id = typeof m.id === "string" ? m.id : null;
    const w = id ? byId.get(id) : undefined;
    if (!w || seen.has(w.id)) continue; // drop unknown/other-user ids and dupes
    seen.add(w.id);

    const isBinary = w.type === "habit";
    let value: number | null = null;
    if (!isBinary) {
      const n = typeof m.value === "number" ? m.value : Number(m.value);
      value = Number.isFinite(n) ? n : null;
      if (value == null) {
        unmatched.push(w.title);
        continue;
      }
    }

    let confidence: "high" | "low" = m.confidence === "low" ? "low" : "high";
    let reason: string | null =
      typeof m.reason === "string" && m.reason.trim() ? m.reason.trim().slice(0, 120) : null;

    const flag = sanityReason(w, value);
    if (flag) {
      confidence = "low";
      reason = flag;
    }

    items.push({ widgetId: w.id, value, completeBinary: isBinary, confidence, reason });
  }

  return { items, unmatched };
}

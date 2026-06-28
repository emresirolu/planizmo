import { NextResponse } from "next/server";
import {
  deleteLog,
  getLog,
  getMyTimezone,
  getMyWidget,
  listMyWidgets,
  requireUserId,
  upsertLog,
  UnauthenticatedError,
} from "@/lib/db/scoped";
import { todayInTimeZone } from "@/lib/widgets/date";
import { nextLogState } from "@/lib/widgets/logic";
import { recomputeMyStreak } from "@/lib/widgets/streak-service";
import { isStreakType, type LogState, type WidgetType } from "@/lib/widgets/types";
import { allowRequest } from "@/lib/assistant/ratelimit";
import { parseTalkToLog } from "@/lib/assistant/talk-to-log";

export const runtime = "nodejs";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Shape returned for an entry that was actually written (carries undo state). */
type AppliedItem = {
  widgetId: string;
  title: string;
  unit: string | null;
  type: WidgetType;
  date: string;
  value: number | null;
  completed: boolean;
  prevValue: number | null;
  prevCompleted: boolean;
  hadLog: boolean;
};

/** Shape for an entry we want the user to confirm before writing. */
type PendingItem = {
  widgetId: string;
  title: string;
  unit: string | null;
  type: WidgetType;
  value: number | null;
  reason: string | null;
};

async function resolveDate(input: unknown): Promise<string> {
  if (typeof input === "string" && DATE_RE.test(input)) return input;
  return todayInTimeZone(await getMyTimezone());
}

/** Write one update through the scoped helpers; returns undo state, or null if
 *  the widget isn't the user's (ownership is enforced by getMyWidget). */
async function applyOne(widgetId: string, value: number | null, date: string): Promise<AppliedItem | null> {
  const w = await getMyWidget(widgetId);
  if (!w) return null;

  const existing = await getLog(widgetId, date);
  const prev: LogState = {
    value: existing?.value != null ? Number(existing.value) : null,
    completed: existing?.completed ?? false,
  };
  const next: LogState =
    value == null
      ? { value: prev.value, completed: true } // binary habit: presence = done
      : nextLogState({ type: w.type, target: w.target ?? null }, prev, { kind: "set", value });

  const row = await upsertLog(widgetId, date, next);
  if (isStreakType(w.type)) await recomputeMyStreak(widgetId, date);

  return {
    widgetId,
    title: w.title,
    unit: w.unit ?? null,
    type: w.type,
    date,
    value: row.value != null ? Number(row.value) : null,
    completed: row.completed,
    prevValue: prev.value,
    prevCompleted: prev.completed,
    hadLog: Boolean(existing),
  };
}

async function undoOne(it: AppliedItem): Promise<void> {
  const w = await getMyWidget(it.widgetId);
  if (!w) return;
  if (it.hadLog) {
    await upsertLog(it.widgetId, it.date, { value: it.prevValue, completed: it.prevCompleted });
  } else {
    await deleteLog(it.widgetId, it.date);
  }
  if (isStreakType(w.type)) await recomputeMyStreak(it.widgetId, it.date);
}

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (e) {
    if (e instanceof UnauthenticatedError) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    throw e;
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const op = typeof body.op === "string" ? body.op : "parse";

  /* ---- parse: classify into auto-applied vs. needs-confirm ---- */
  if (op === "parse") {
    if (!allowRequest(userId)) {
      return NextResponse.json({ ok: false, error: "Too many requests — give me a moment." }, { status: 429 });
    }
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return NextResponse.json({ ok: false, error: "Tell me what you did." }, { status: 400 });
    if (text.length > 600) return NextResponse.json({ ok: false, error: "That's a bit long — keep it to a sentence or two." }, { status: 400 });

    const date = await resolveDate(body.date);
    const widgets = await listMyWidgets();
    const { items, unmatched, noModel } = await parseTalkToLog(text, widgets);

    const applied: AppliedItem[] = [];
    const pending: PendingItem[] = [];

    for (const it of items) {
      // Apply when confident and in-range; otherwise hold for confirmation.
      if (it.confidence === "high" && !it.reason) {
        const res = await applyOne(it.widgetId, it.value, date);
        if (res) applied.push(res);
      } else {
        const w = widgets.find((x) => x.id === it.widgetId);
        if (w) {
          pending.push({
            widgetId: w.id,
            title: w.title,
            unit: w.unit ?? null,
            type: w.type,
            value: it.value,
            reason: it.reason,
          });
        }
      }
    }

    return NextResponse.json({ ok: true, date, applied, pending, unmatched, noModel: noModel ?? false });
  }

  /* ---- apply: write items the user confirmed ---- */
  if (op === "apply") {
    const raw = Array.isArray(body.items) ? body.items : [];
    const applied: AppliedItem[] = [];
    for (const r of raw as Array<Record<string, unknown>>) {
      const widgetId = typeof r.widgetId === "string" ? r.widgetId : null;
      if (!widgetId) continue;
      const value = r.value == null ? null : Number(r.value);
      if (value != null && !Number.isFinite(value)) continue;
      const date = await resolveDate(r.date);
      const res = await applyOne(widgetId, value, date);
      if (res) applied.push(res);
    }
    return NextResponse.json({ ok: true, applied });
  }

  /* ---- undo: restore prior log state for previously applied items ---- */
  if (op === "undo") {
    const raw = Array.isArray(body.items) ? body.items : [];
    for (const r of raw as Array<Record<string, unknown>>) {
      const widgetId = typeof r.widgetId === "string" ? r.widgetId : null;
      const date = typeof r.date === "string" && DATE_RE.test(r.date) ? r.date : null;
      if (!widgetId || !date) continue;
      await undoOne({
        widgetId,
        date,
        title: "",
        unit: null,
        type: "counter",
        value: null,
        completed: false,
        prevValue: r.prevValue == null ? null : Number(r.prevValue),
        prevCompleted: Boolean(r.prevCompleted),
        hadLog: Boolean(r.hadLog),
      });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "unknown op" }, { status: 400 });
}

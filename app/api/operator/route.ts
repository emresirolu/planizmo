import { NextResponse } from "next/server";
import {
  deleteLog,
  getBodyMetric,
  getLog,
  getMyTimezone,
  getMyWidget,
  listMyWidgets,
  requireUserId,
  upsertBodyMetric,
  upsertLog,
  UnauthenticatedError,
} from "@/lib/db/scoped";
import { todayInTimeZone } from "@/lib/widgets/date";
import { nextLogState } from "@/lib/widgets/logic";
import { recomputeMyStreak } from "@/lib/widgets/streak-service";
import { isStreakType, type LogState } from "@/lib/widgets/types";
import { allowRequest } from "@/lib/assistant/ratelimit";
import { bodyFieldFor, parseTalkToLog, BODY_TARGETS } from "@/lib/assistant/talk-to-log";

export const runtime = "nodejs";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type Kind = "widget" | "body";

/** Shape returned for an entry that was actually written (carries undo state). */
type AppliedItem = {
  targetId: string;
  kind: Kind;
  title: string;
  unit: string | null;
  date: string;
  value: number | null;
  completed: boolean;
  prevValue: number | null;
  prevCompleted: boolean;
  hadLog: boolean;
};

type PendingItem = {
  targetId: string;
  kind: Kind;
  binary: boolean;
  title: string;
  unit: string | null;
  value: number | null;
  reason: string | null;
};

async function resolveDate(input: unknown): Promise<string> {
  if (typeof input === "string" && DATE_RE.test(input)) return input;
  return todayInTimeZone(await getMyTimezone());
}

function bodyTitle(targetId: string): { title: string; unit: string | null } {
  const b = BODY_TARGETS.find((x) => x.id === targetId);
  return { title: b?.title ?? "Body metric", unit: b?.unit ?? null };
}

/** Apply one update (widget log or body metric). Returns undo state, or null if
 *  the target isn't the user's (ownership enforced by scoped helpers). */
async function applyOne(
  targetId: string,
  kind: Kind,
  value: number | null,
  date: string,
): Promise<AppliedItem | null> {
  if (kind === "body") {
    const field = bodyFieldFor(targetId);
    if (!field || value == null) return null;
    const prev = await getBodyMetric(date);
    const prevValue = prev && prev[field] != null ? Number(prev[field]) : null;
    await upsertBodyMetric(date, { [field]: value });
    const { title, unit } = bodyTitle(targetId);
    return {
      targetId,
      kind,
      title,
      unit,
      date,
      value,
      completed: false,
      prevValue,
      prevCompleted: false,
      hadLog: prevValue != null,
    };
  }

  const w = await getMyWidget(targetId);
  if (!w) return null;
  const existing = await getLog(targetId, date);
  const prev: LogState = {
    value: existing?.value != null ? Number(existing.value) : null,
    completed: existing?.completed ?? false,
  };
  const next: LogState =
    value == null
      ? { value: prev.value, completed: true } // binary habit: presence = done
      : nextLogState({ type: w.type, target: w.target ?? null }, prev, { kind: "set", value });

  const row = await upsertLog(targetId, date, next);
  if (isStreakType(w.type)) await recomputeMyStreak(targetId, date);

  return {
    targetId,
    kind,
    title: w.title,
    unit: w.unit ?? null,
    date,
    value: row.value != null ? Number(row.value) : null,
    completed: row.completed,
    prevValue: prev.value,
    prevCompleted: prev.completed,
    hadLog: Boolean(existing),
  };
}

async function undoOne(it: {
  targetId: string;
  kind: Kind;
  date: string;
  prevValue: number | null;
  prevCompleted: boolean;
  hadLog: boolean;
}): Promise<void> {
  if (it.kind === "body") {
    const field = bodyFieldFor(it.targetId);
    if (field) await upsertBodyMetric(it.date, { [field]: it.prevValue });
    return;
  }
  const w = await getMyWidget(it.targetId);
  if (!w) return;
  if (it.hadLog) {
    await upsertLog(it.targetId, it.date, { value: it.prevValue, completed: it.prevCompleted });
  } else {
    await deleteLog(it.targetId, it.date);
  }
  if (isStreakType(w.type)) await recomputeMyStreak(it.targetId, it.date);
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
      if (it.confidence === "high" && !it.reason) {
        const res = await applyOne(it.targetId, it.kind, it.value, date);
        if (res) applied.push(res);
      } else {
        pending.push({
          targetId: it.targetId,
          kind: it.kind,
          binary: it.binary,
          title: it.title,
          unit: it.unit,
          value: it.value,
          reason: it.reason,
        });
      }
    }

    return NextResponse.json({ ok: true, date, applied, pending, unmatched, noModel: noModel ?? false });
  }

  /* ---- apply: write items the user confirmed ---- */
  if (op === "apply") {
    const raw = Array.isArray(body.items) ? body.items : [];
    const applied: AppliedItem[] = [];
    for (const r of raw as Array<Record<string, unknown>>) {
      const targetId = typeof r.targetId === "string" ? r.targetId : null;
      if (!targetId) continue;
      const kind: Kind = r.kind === "body" ? "body" : "widget";
      const value = r.value == null ? null : Number(r.value);
      if (value != null && !Number.isFinite(value)) continue;
      const date = await resolveDate(r.date);
      const res = await applyOne(targetId, kind, value, date);
      if (res) applied.push(res);
    }
    return NextResponse.json({ ok: true, applied });
  }

  /* ---- undo: restore prior state for previously applied items ---- */
  if (op === "undo") {
    const raw = Array.isArray(body.items) ? body.items : [];
    for (const r of raw as Array<Record<string, unknown>>) {
      const targetId = typeof r.targetId === "string" ? r.targetId : null;
      const date = typeof r.date === "string" && DATE_RE.test(r.date) ? r.date : null;
      if (!targetId || !date) continue;
      await undoOne({
        targetId,
        kind: r.kind === "body" ? "body" : "widget",
        date,
        prevValue: r.prevValue == null ? null : Number(r.prevValue),
        prevCompleted: Boolean(r.prevCompleted),
        hadLog: Boolean(r.hadLog),
      });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "unknown op" }, { status: 400 });
}

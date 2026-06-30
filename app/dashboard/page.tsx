import { redirect } from "next/navigation";
import { auth } from "@/auth";
import TodayDaybook, { type GlanceItem } from "@/components/daybook/TodayDaybook";
import { getMyProfile, listEventsBetween } from "@/lib/db/scoped";
import { loadDashboard } from "@/lib/widgets/dashboard-data";
import { addDays } from "@/lib/widgets/streak";
import type { ClientEvent } from "@/lib/calendar/types";

const ENERGY = ["—", "rough", "low", "steady", "good", "peak"];

export default async function TodayPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  await getMyProfile();
  const data = await loadDashboard();
  const today = data.today;
  const tomorrow = addDays(today, 1);

  const [todayRows, tomRows] = await Promise.all([
    listEventsBetween(today, today),
    listEventsBetween(tomorrow, tomorrow),
  ]);

  const blocks: ClientEvent[] = todayRows.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    startTime: e.startTime ? e.startTime.slice(0, 5) : null,
    endTime: e.endTime ? e.endTime.slice(0, 5) : null,
    type: e.type,
    source: e.source,
    completed: e.completed,
    linkedWidgetId: e.linkedWidgetId,
  }));

  const nextId = blocks.find((b) => !b.completed)?.id ?? null;
  const doneCount = blocks.filter((b) => b.completed).length;

  // glance strip from the user's real trackers (— when not present)
  const find = (re: RegExp, unit?: RegExp) =>
    data.widgets.find((w) => re.test(w.title) || (unit && w.unit && unit.test(w.unit)));
  const valOf = (id?: string) => (id ? data.logs[id]?.value ?? null : null);

  const sleepW = find(/sleep/i, /hours?/i);
  const moodW = data.widgets.find((w) => w.type === "mood");
  const proteinW = find(/protein/i);
  const gymBlock = blocks.find((b) => /gym|workout|train|lift/i.test(b.title));

  const glance: GlanceItem[] = [
    { label: "SLEEP", value: valOf(sleepW?.id) != null ? `${valOf(sleepW?.id)}h` : "—" },
    { label: "ENERGY", value: moodW && valOf(moodW.id) != null ? ENERGY[Math.max(0, Math.min(5, Math.round(valOf(moodW.id)!)))] : "—" },
    { label: "PROTEIN", value: proteinW ? `${valOf(proteinW.id) ?? 0}/${proteinW.target ?? "—"}` : "—" },
    { label: "GYM", value: gymBlock?.startTime ? gymBlock.startTime : "rest", accent: Boolean(gymBlock?.startTime) },
    { label: "FOCUS", value: blocks.length ? `${doneCount}/${blocks.length}` : "0/0", accent: true },
  ];

  const summary =
    blocks.length === 0
      ? "A blank page — shape your day."
      : `${blocks.length} time block${blocks.length === 1 ? "" : "s"} today${doneCount ? ` · ${doneCount} done` : ""}.`;

  const marginNote =
    doneCount > 0
      ? "Good momentum — keep the next block protected."
      : "Start with the first block while you're fresh — the rest follows.";

  const tom = tomRows.map((e) => ({ id: e.id, title: e.title, startTime: e.startTime ? e.startTime.slice(0, 5) : null }));

  return (
    <TodayDaybook summary={summary} glance={glance} blocks={blocks} nextId={nextId} marginNote={marginNote} tomorrow={tom} />
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { week: string; value: number };
type Card = { improved: string; slipped: string; fix: string; truth: string };

export type ReviewData = {
  hasData: boolean;
  scorecards: { label: string; value: string; sub: string }[];
  consistency: Point[];
  workouts: Point[];
  metrics: Record<string, number>;
};

export default function ReviewBoard({ data }: { data: ReviewData }) {
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!data.hasData) { setLoading(false); return; }
    let active = true;
    fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ metrics: data.metrics }) })
      .then((r) => r.json())
      .then((d) => { if (active && d.ok) setCard(d.card); })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [data]);

  if (!data.hasData) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-7 md:px-8">
        <div className="rounded-[12px] border px-5 py-12 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 20 }}>Your first review is coming.</div>
          <p className="mx-auto mt-2 max-w-sm text-[13.5px]" style={{ color: "var(--muted)" }}>Log a few days of trackers, workouts, and time blocks. After a week, Planizmo will tell you whether you&apos;re improving or drifting.</p>
        </div>
      </div>
    );
  }

  const axis = { tick: { fontSize: 11, fill: "var(--muted)" }, tickLine: false, axisLine: false } as const;
  const tip = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 } as const;

  return (
    <div className="mx-auto max-w-5xl px-6 py-7 md:px-8">
      <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", color: "var(--muted)" }}>Am I improving, or drifting?</div>

      {/* scorecards */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {data.scorecards.map((s) => (
          <div key={s.label} className="rounded-[12px] border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".1em", color: "var(--faint)" }}>{s.label}</div>
            <div className="mt-1.5 tracking-tight" style={{ fontFamily: "var(--serif)", fontSize: 26 }}>{s.value}</div>
            <div className="text-[11.5px]" style={{ color: "var(--muted)" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* charts */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-[12px] border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="text-[13px] font-semibold" style={{ fontFamily: "var(--serif)" }}>Consistency over time</div>
          <div className="mt-2" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.consistency} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" {...axis} />
                <YAxis domain={[0, 100]} {...axis} width={36} />
                <Tooltip contentStyle={tip} formatter={(v) => [`${v}%`, "Consistency"] as [string, string]} />
                <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2.25} dot={{ r: 2.5, fill: "var(--accent)" }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-[12px] border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="text-[13px] font-semibold" style={{ fontFamily: "var(--serif)" }}>Workout frequency</div>
          <div className="mt-2" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.workouts} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" {...axis} />
                <YAxis allowDecimals={false} {...axis} width={32} />
                <Tooltip contentStyle={tip} cursor={{ fill: "color-mix(in srgb, var(--accent) 8%, transparent)" }} formatter={(v) => [v, "Workouts"] as [string, string]} />
                <Bar dataKey="value" fill="var(--accent)" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Planizmo review card */}
      <div className="mt-4 overflow-hidden rounded-[14px] border" style={{ borderColor: "var(--accent)", background: "var(--surface)" }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", borderBottom: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}>
          <span className="flex" style={{ color: "var(--accent)" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" /></svg></span>
          <span style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 600 }}>Planizmo review</span>
        </div>
        <div className="flex flex-col gap-4 p-5">
          {loading || !card ? (
            <div className="text-[13px]" style={{ color: "var(--muted)" }}>{loading ? "Reading your week…" : "No read available yet."}</div>
          ) : (
            <>
              <Row k="WHAT IMPROVED" color="var(--accent)" text={card.improved} />
              <Row k="WHAT SLIPPED" color="var(--alert)" text={card.slipped} />
              <Row k="HIGHEST-LEVERAGE FIX" color="var(--faint)" text={card.fix} />
              <Row k="ONE UNCOMFORTABLE TRUTH" color="var(--ink)" text={card.truth} />
            </>
          )}
          <Link href="/dashboard/calendar?v=week" className="self-start rounded-[9px] px-4 py-2.5 text-[13px] font-semibold" style={{ background: "var(--accent)", color: "#F6F1E6" }}>
            Plan next week from this review
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ k, color, text }: { k: string; color: string; text: string }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".1em", color }}>{k}</div>
      <div className="mt-1 text-[14px] leading-relaxed">{text}</div>
    </div>
  );
}

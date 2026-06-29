"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Direction } from "@/lib/gym/types";

export type TrendPoint = { date: string; value: number };

function shortDate(d: string): string {
  // d is YYYY-MM-DD; render as M/D without timezone drift.
  const [, m, day] = d.split("-");
  return `${Number(m)}/${Number(day)}`;
}

function fmt(value: number, unit: string): string {
  const v = Math.round(value * 10) / 10;
  if (!unit) return String(v);
  return unit.length <= 2 ? `${v}${unit}` : `${v} ${unit}`;
}

/**
 * A small line chart that answers "am I improving?" at a glance, respecting the
 * metric's own direction (down is good for body fat / screen time, up is good
 * for muscle). Inviting empty states — never a "0% / failure" look.
 */
export default function TrendChart({
  data,
  label,
  unit,
  direction,
  height = 168,
}: {
  data: TrendPoint[];
  label: string;
  unit: string;
  direction: Direction;
  height?: number;
}) {
  const success = "var(--success, #3fb984)";
  const warn = "#e0a53d";
  const accent = "var(--accent)";

  if (data.length === 0) {
    return (
      <div className="rounded-[16px] border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="text-[13.5px] font-semibold">{label}</div>
        <div className="mt-3 flex flex-col items-center justify-center gap-1.5 rounded-[12px] py-8 text-center" style={{ background: "var(--surface2)" }}>
          <span className="text-[13px]" style={{ color: "var(--muted)" }}>No {label.toLowerCase()} logged yet</span>
          <span className="text-[12px]" style={{ color: "var(--muted)", opacity: 0.8 }}>Log it once to start your trend.</span>
        </div>
      </div>
    );
  }

  const first = data[0].value;
  const last = data[data.length - 1].value;
  const delta = Math.round((last - first) * 10) / 10;
  const improving: boolean | null =
    data.length < 2 || direction === "neutral" || delta === 0
      ? null
      : direction === "up"
        ? delta > 0
        : delta < 0;

  const lineColor = improving === null ? accent : improving ? success : warn;
  const deltaSign = delta > 0 ? "+" : "";

  return (
    <div className="rounded-[16px] border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="flex items-baseline justify-between">
        <div className="text-[13.5px] font-semibold">{label}</div>
        <div className="flex items-baseline gap-2">
          <span className="text-[18px] font-semibold tracking-tight">{fmt(last, unit)}</span>
          {improving !== null && (
            <span
              className="rounded-full px-2 py-0.5 text-[11.5px] font-medium"
              style={{
                background: `color-mix(in srgb, ${improving ? success : warn} 16%, transparent)`,
                color: improving ? success : warn,
              }}
            >
              {deltaSign}{fmt(delta, unit)}
            </span>
          )}
        </div>
      </div>
      <div style={{ height }} className="mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} minTickGap={20} />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
              labelFormatter={(l) => shortDate(String(l))}
              formatter={(v) => [fmt(Number(v), unit), label] as [string, string]}
            />
            <Line type="monotone" dataKey="value" stroke={lineColor} strokeWidth={2.25} dot={{ r: 2.5, fill: lineColor }} activeDot={{ r: 4 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

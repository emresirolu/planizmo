"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import TrendChart, { type TrendPoint } from "@/components/TrendChart";
import type { Direction } from "@/lib/gym/types";

export type TrackerSeries = {
  id: string;
  title: string;
  unit: string;
  direction: Direction;
  points: TrendPoint[];
};

/** Per-tracker progress graphs — "am I improving?" with correct direction. */
export default function TrackerTrends({ series }: { series: TrackerSeries[] }) {
  const router = useRouter();
  useEffect(() => {
    const f = () => router.refresh();
    window.addEventListener("planizmo:data-changed", f);
    return () => window.removeEventListener("planizmo:data-changed", f);
  }, [router]);

  if (series.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-[18px] font-medium tracking-tight">Trends</h2>
      <p className="mt-0.5 text-[13px]" style={{ color: "var(--muted)" }}>Last 60 days — pointing the right way for each metric.</p>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {series.map((s) => (
          <TrendChart key={s.id} data={s.points} label={s.title} unit={s.unit} direction={s.direction} />
        ))}
      </div>
    </section>
  );
}

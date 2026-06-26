import Heatmap from "./Heatmap";
import type { HeatCell, StreakStats } from "@/lib/widgets/types";

type Props = {
  stats: StreakStats;
  heatcells?: HeatCell[];
  showHeatmap?: boolean;
};

/** Streak/strength display. Strength is primary; copy is encouraging. */
export default function StreakFooter({ stats, heatcells, showHeatmap }: Props) {
  const { currentStreak, longestStreak, strength } = stats;
  const message =
    currentStreak > 0
      ? "On a roll."
      : strength > 0
        ? "Back on it today."
        : "Log today to begin.";

  return (
    <div className="mt-1 flex flex-col gap-2.5 border-t pt-3" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-medium tracking-tight" style={{ color: "var(--accent)" }}>
            {strength}%
          </span>
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>strength</span>
        </div>
        <div className="flex items-center gap-3 text-[12px]" style={{ color: "var(--muted)" }}>
          <span className="flex items-center gap-1" style={{ color: currentStreak > 0 ? "var(--text)" : "var(--muted)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c.6 3 2.4 4 3.6 5.6C16.8 10.2 17.5 11.8 17.5 13.5a5.5 5.5 0 0 1-11 0c0-1.3.5-2.4 1.2-3.2.4 1.2 1.3 1.7 2 1.7-.8-1.6-.4-3.8 2.3-6z" />
            </svg>
            {currentStreak}d
          </span>
          <span title="Longest streak">best {longestStreak}d</span>
        </div>
      </div>

      {showHeatmap && heatcells && heatcells.length > 0 && (
        <Heatmap cells={heatcells} />
      )}

      <div className="text-[12px]" style={{ color: "var(--muted)" }}>{message}</div>
    </div>
  );
}

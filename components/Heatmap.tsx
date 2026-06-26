import type { HeatCell } from "@/lib/widgets/types";

/** ~12-week completion heatmap. Accent = done, faint = scheduled-but-not. */
export default function Heatmap({ cells }: { cells: HeatCell[] }) {
  return (
    <div
      className="grid w-full gap-[3px]"
      style={{
        gridTemplateRows: "repeat(7, 1fr)",
        gridAutoFlow: "column",
        gridAutoColumns: "1fr",
      }}
    >
      {cells.map((c) => {
        let bg = "var(--surface2)";
        let opacity = 1;
        if (c.level === 4) bg = "var(--accent)";
        else if (c.level === 0) opacity = 0.4;
        return (
          <div
            key={c.date}
            title={c.date}
            className="rounded-[2px]"
            style={{ background: bg, opacity, aspectRatio: "1 / 1" }}
          />
        );
      })}
    </div>
  );
}

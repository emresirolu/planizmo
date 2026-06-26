type Props = {
  completed: number;
  total: number;
  size?: number;
};

/** Circular daily-completion ring. Respects the active theme + accent. */
export default function CompletionRing({ completed, total, size = 92 }: Props) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, completed / total) : 0;
  const dash = c * pct;

  return (
    <div
      className="flex items-center gap-4 rounded-2xl border p-4"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="relative flex-none" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--surface2)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            style={{ transition: "stroke-dasharray .4s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-medium leading-none tracking-tight">
            {completed}
            <span style={{ color: "var(--muted)" }}> / {total}</span>
          </span>
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium">Today</div>
        <div className="mt-1 text-[13px] leading-relaxed" style={{ color: "var(--muted)" }}>
          {total === 0
            ? "Add a widget to start tracking."
            : completed >= total
              ? "All done — nice work."
              : `${total - completed} left to complete today.`}
        </div>
      </div>
    </div>
  );
}

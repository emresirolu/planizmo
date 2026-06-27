export default function ComingSoonPage({
  title,
  blurb,
  milestone,
}: {
  title: string;
  blurb: string;
  milestone: string;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-[28px] font-medium tracking-tight">{title}</h1>
      <div
        className="mt-5 flex flex-col items-start gap-3 rounded-[18px] border p-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: "var(--surface2)", color: "var(--muted)" }}>
          coming soon · {milestone}
        </span>
        <p className="text-[14.5px] leading-relaxed" style={{ color: "var(--muted)" }}>{blurb}</p>
      </div>
    </div>
  );
}

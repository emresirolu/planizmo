import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl text-white" style={{ background: "var(--accent)" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" /></svg>
      </span>
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Page not found</h1>
        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--muted)" }}>
          That page wandered off. Let's get you back to your day.
        </p>
      </div>
      <Link href="/dashboard" className="rounded-xl px-4 py-2.5 text-sm font-medium text-white" style={{ background: "var(--accent)" }}>
        Back to dashboard
      </Link>
    </main>
  );
}

import Link from "next/link";
import { auth } from "@/auth";
import { getMyProfile } from "@/lib/db/scoped";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

function formatToday(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default async function DashboardPage() {
  const session = await auth();
  const profile = await getMyProfile();

  const name =
    profile?.displayName?.split(" ")[0] ??
    session?.user?.name?.split(" ")[0] ??
    "there";
  const greeting = greetingForHour(new Date().getHours());

  return (
    <div className="flex flex-col">
      {/* header */}
      <div className="px-1 pb-4 pt-1">
        <div className="text-[13px]" style={{ color: "var(--muted)" }}>
          {formatToday()}
        </div>
        <h1 className="mt-1 text-3xl font-medium tracking-tight">
          {greeting}, {name}
        </h1>
      </div>

      {/* welcome card (not a widget — the grid below is intentionally empty) */}
      <div
        className="flex gap-3 rounded-2xl border p-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div
          className="flex h-9 w-9 flex-none items-center justify-center rounded-xl"
          style={{ background: "var(--surface2)", color: "var(--accent)" }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" />
          </svg>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-sm leading-relaxed">
            Your dashboard is ready. This is your calm home base.
          </p>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--accent)", fontWeight: 500 }}
          >
            Widgets, habits, and your daily brief arrive in the next milestone.
          </p>
        </div>
      </div>

      {/* section label */}
      <div
        className="mx-1 mb-3 mt-6 text-[13px]"
        style={{ color: "var(--muted)" }}
      >
        Today
      </div>

      {/* empty widget grid */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="col-span-2 flex flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed px-5 py-10 text-center"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="text-sm">No widgets yet</span>
          <span className="text-[13px]" style={{ opacity: 0.85 }}>
            Once widgets ship you’ll add them here — or just describe a goal.
          </span>
        </div>
      </div>

      {/* settings affordance */}
      <Link
        href="/dashboard/settings"
        className="mt-3 flex items-center justify-between rounded-2xl px-4 py-3.5"
        style={{ background: "var(--surface2)" }}
      >
        <span className="flex items-center gap-2.5 text-sm">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 7h9M18 7h2M4 12h2M11 12h9M4 17h7M16 17h4" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="9" cy="12" r="2" />
            <circle cx="14" cy="17" r="2" />
          </svg>
          Personalize your theme &amp; accent
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--muted)"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </Link>
    </div>
  );
}

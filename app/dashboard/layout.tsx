import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BottomNav, SideNav, SignOutButton } from "@/components/nav";
import AssistantRail from "@/components/AssistantRail";
import { getMyProfile } from "@/lib/db/scoped";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const profile = await getMyProfile();
  const tz = profile?.timezone || "UTC";
  const name =
    profile?.displayName?.split(" ")[0] ??
    session.user.name?.split(" ")[0] ??
    "there";
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(new Date()),
  );
  const greeting = greetingForHour(hour);

  return (
    <div className="flex min-h-dvh">
      {/* desktop sidebar */}
      <SideNav />

      {/* main column */}
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        {/* mobile top bar */}
        <header
          className="sticky top-0 z-10 flex items-center justify-between border-b px-5 py-3.5 md:hidden"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ background: "var(--accent)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" />
              </svg>
            </span>
            <span className="text-[15px] font-medium tracking-tight">planizmo</span>
          </div>
          <SignOutButton variant="pill" />
        </header>

        <main className="pz-scroll flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-6">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>

        <BottomNav />
      </div>

      {/* persistent AI rail (desktop) / launcher + sheet (mobile) */}
      <AssistantRail name={name} greeting={greeting} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BottomNav, SideNav } from "@/components/nav";
import TopBar from "@/components/TopBar";
import AssistantRail from "@/components/AssistantRail";
import OperatorBarSlot from "@/components/OperatorBarSlot";
import PromoBanner from "@/components/PromoBanner";
import { getMyProfile, getPlanContext } from "@/lib/db/scoped";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
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

  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(now));
  const dateLabel = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", year: "numeric" }).format(now);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long" }).format(now);
  const greeting = greetingForHour(hour);

  const planCtx = await getPlanContext();
  const showPromo = planCtx.promo && !(planCtx.raw === "pro" || planCtx.owner);

  return (
    <div className="flex min-h-dvh">
      <SideNav name={name} />

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <TopBar dateLabel={dateLabel} weekday={weekday} />
        <main className="pz-sc flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-6">
          {showPromo && (
            <div className="mx-auto mb-2 w-full max-w-5xl">
              <PromoBanner until={planCtx.promoUntil} />
            </div>
          )}
          <div className="mb-5 empty:hidden">
            <OperatorBarSlot />
          </div>
          {children}
        </main>
        <BottomNav />
      </div>

      <AssistantRail name={name} greeting={greeting} />
    </div>
  );
}

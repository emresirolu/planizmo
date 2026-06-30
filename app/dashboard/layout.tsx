import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Sidebar from "@/components/daybook/Sidebar";
import Header from "@/components/daybook/Header";
import MobileNav from "@/components/daybook/MobileNav";
import QuickCapture from "@/components/daybook/QuickCapture";
import { getMyProfile } from "@/lib/db/scoped";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const profile = await getMyProfile();
  const name =
    profile?.displayName?.split(" ")[0] ??
    session.user.name?.split(" ")[0] ??
    "You";

  return (
    <div className="pz-paper flex min-h-dvh" style={{ background: "var(--canvas)" }}>
      <Sidebar name={name} />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <Header />
        <main className="pz-sc flex-1 overflow-y-auto" style={{ background: "var(--paper)" }}>
          {children}
        </main>
        <MobileNav />
      </div>
      <QuickCapture />
    </div>
  );
}

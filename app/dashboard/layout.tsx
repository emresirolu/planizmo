import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import BottomNav from "@/components/BottomNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col">
      {/* top bar */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between border-b px-5 py-3.5"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
            style={{ background: "var(--accent)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" />
            </svg>
          </span>
          <span className="text-[15px] font-medium tracking-tight">
            planizmo
          </span>
        </div>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/signin" });
          }}
        >
          <button
            type="submit"
            className="rounded-full border px-3.5 py-1.5 text-[13px] transition-colors"
            style={{
              borderColor: "var(--border)",
              color: "var(--muted)",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </form>
      </header>

      <main className="pz-scroll flex-1 overflow-y-auto px-4 py-4">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}

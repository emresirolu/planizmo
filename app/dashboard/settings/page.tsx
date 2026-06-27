import ThemeControls from "@/components/ThemeControls";
import ViewModeControl from "@/components/ViewModeControl";
import { SignOutButton } from "@/components/nav";
import Link from "next/link";
import { getMyPlan, getMyProfile, getMyViewMode } from "@/lib/db/scoped";
import { DEFAULT_ACCENT, DEFAULT_THEME } from "@/lib/theme/themes";

export default async function SettingsPage() {
  const profile = await getMyProfile();
  const theme = profile?.theme ?? DEFAULT_THEME;
  const accent = profile?.accentColor ?? DEFAULT_ACCENT;
  const viewMode = await getMyViewMode();
  const plan = await getMyPlan();

  return (
    <div className="flex flex-col">
      <h1 className="px-1 pb-4 pt-2 text-3xl font-medium tracking-tight">
        Settings
      </h1>

      <div className="mx-1 mb-3 text-[13px]" style={{ color: "var(--muted)" }}>
        Appearance
      </div>
      <Link
        href="/dashboard/upgrade"
        className="mb-5 flex items-center justify-between rounded-2xl border p-4"
        style={{
          background: plan === "pro" ? "var(--surface)" : "color-mix(in srgb, var(--accent) 9%, var(--surface))",
          borderColor: plan === "pro" ? "var(--border)" : "color-mix(in srgb, var(--accent) 26%, transparent)",
        }}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: "var(--accent)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" /></svg>
          </span>
          <div>
            <div className="text-sm font-medium" style={{ color: plan === "pro" ? "var(--text)" : "var(--accent)" }}>
              {plan === "pro" ? "Planizmo Pro" : "Upgrade to Planizmo Pro"}
            </div>
            <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>
              {plan === "pro" ? "All features unlocked." : "Timeline, unlimited AI planning, health sync, all themes."}
            </div>
          </div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
      </Link>

      <ThemeControls initialTheme={theme} initialAccent={accent} plan={plan} />

      <div className="mx-1 mb-3 mt-6 text-[13px]" style={{ color: "var(--muted)" }}>
        Layout
      </div>
      <ViewModeControl initial={viewMode} plan={plan} />
      <p className="mx-1 mt-2 text-[12.5px] leading-relaxed" style={{ color: "var(--muted)" }}>
        Reorder and resize widgets from the Habits and Lists pages — tap “Arrange”.
      </p>

      <div className="mx-1 mb-3 mt-6 text-[13px]" style={{ color: "var(--muted)" }}>
        Account
      </div>
      <div
        className="rounded-2xl border"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-sm" style={{ color: "var(--muted)" }}>
            Plan
          </span>
          <span className="text-sm capitalize">{profile?.plan ?? "free"}</span>
        </div>
        <div className="h-px" style={{ background: "var(--border)" }} />
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-sm" style={{ color: "var(--muted)" }}>
            Signed in as
          </span>
          <span className="text-sm">{profile?.displayName ?? "—"}</span>
        </div>
      </div>

      <p
        className="mx-1 mt-4 text-[13px] leading-relaxed"
        style={{ color: "var(--muted)" }}
      >
        Your theme and accent are saved to your account and follow you across
        devices.
      </p>

      <div className="mt-6 max-w-xs">
        <SignOutButton variant="row" />
      </div>
    </div>
  );
}

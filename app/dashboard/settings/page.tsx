import ThemeControls from "@/components/ThemeControls";
import { SignOutButton } from "@/components/nav";
import { getMyProfile } from "@/lib/db/scoped";
import { DEFAULT_ACCENT, DEFAULT_THEME } from "@/lib/theme/themes";

export default async function SettingsPage() {
  const profile = await getMyProfile();
  const theme = profile?.theme ?? DEFAULT_THEME;
  const accent = profile?.accentColor ?? DEFAULT_ACCENT;

  return (
    <div className="flex flex-col">
      <h1 className="px-1 pb-4 pt-2 text-3xl font-medium tracking-tight">
        Settings
      </h1>

      <div className="mx-1 mb-3 text-[13px]" style={{ color: "var(--muted)" }}>
        Appearance
      </div>
      <ThemeControls initialTheme={theme} initialAccent={accent} />

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

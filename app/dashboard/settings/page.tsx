import Link from "next/link";
import { SignOutButton } from "@/components/nav";
import AccountPrivacy from "@/components/daybook/AccountPrivacy";
import { getMyEmail, getMyProfile } from "@/lib/db/scoped";

export default async function SettingsPage() {
  const profile = await getMyProfile();
  const email = await getMyEmail();
  const name = profile?.displayName ?? "—";

  const sectionLabel = { fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".16em", color: "var(--faint)" } as const;

  return (
    <div className="mx-auto max-w-2xl px-6 py-7 md:px-8">
      <h1 className="text-[28px] font-medium tracking-tight" style={{ fontFamily: "var(--serif)" }}>Settings</h1>

      {/* Account */}
      <div className="mt-6" style={sectionLabel}>ACCOUNT</div>
      <div className="mt-3 rounded-[14px] border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-[13.5px]" style={{ color: "var(--muted)" }}>Signed in as</span>
          <span className="text-[13.5px] font-medium">{name}</span>
        </div>
        <div className="h-px" style={{ background: "var(--border)" }} />
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-[13.5px]" style={{ color: "var(--muted)" }}>Email</span>
          <span className="text-[13.5px]">{email ?? "—"}</span>
        </div>
      </div>
      <div className="mt-3 max-w-xs">
        <SignOutButton variant="row" />
      </div>

      {/* Privacy & data */}
      <div className="mt-8" style={sectionLabel}>PRIVACY &amp; DATA</div>
      <p className="mb-3 mt-1.5 text-[13px] leading-relaxed" style={{ color: "var(--muted)" }}>
        Your data is used only to run your daybook — never sold. Export, reset, or delete it any time.
      </p>
      <AccountPrivacy />

      {/* Legal */}
      <div className="mt-8 border-t pt-5" style={{ borderColor: "var(--border)" }}>
        <div className="flex flex-wrap gap-4 text-[13px]">
          <Link href="/privacy" style={{ color: "var(--accent)" }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: "var(--accent)" }}>Terms of Use</Link>
          <a href="mailto:emrecanoyunlar@gmail.com" style={{ color: "var(--muted)" }}>Contact</a>
        </div>
      </div>
    </div>
  );
}

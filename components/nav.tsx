"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";

type NavItem = { href: string; label: string; icon: React.ReactNode };

const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const I = {
  today: (
    <svg width="19" height="19" viewBox="0 0 24 24" {...S}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" />
    </svg>
  ),
  planner: (
    <svg width="19" height="19" viewBox="0 0 24 24" {...S}>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </svg>
  ),
  goals: (
    <svg width="19" height="19" viewBox="0 0 24 24" {...S}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.4" />
    </svg>
  ),
  health: (
    <svg width="19" height="19" viewBox="0 0 24 24" {...S}>
      <path d="M12 21s-7-4.4-9.3-9C1.3 9.4 2.4 6 5.6 6c2 0 3.3 1.3 4.4 3M12 21s7-4.4 9.3-9C22.7 9.4 21.6 6 18.4 6c-2 0-3.3 1.3-4.4 3" />
    </svg>
  ),
  trackers: (
    <svg width="19" height="19" viewBox="0 0 24 24" {...S}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1.3" />
      <circle cx="4.5" cy="12" r="1.3" />
      <circle cx="4.5" cy="18" r="1.3" />
    </svg>
  ),
  gym: (
    <svg width="19" height="19" viewBox="0 0 24 24" {...S}>
      <path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11" />
    </svg>
  ),
  finance: (
    <svg width="19" height="19" viewBox="0 0 24 24" {...S}>
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 10.5h18M16.5 14.5h1.5" />
    </svg>
  ),
  ai: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" />
    </svg>
  ),
};

const ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Today", icon: I.today },
  { href: "/dashboard/calendar", label: "Calendar", icon: I.planner },
  { href: "/dashboard/gym", label: "Gym", icon: I.gym },
  { href: "/dashboard/trackers", label: "Trackers", icon: I.trackers },
  { href: "/dashboard/goals", label: "Goals", icon: I.goals },
];

function active(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

function openAssistant() {
  window.dispatchEvent(new Event("planizmo:assistant"));
}

export function SideNav({ name }: { name: string }) {
  const pathname = usePathname();
  return (
    <aside
      className="sticky top-0 hidden h-dvh w-[212px] flex-none flex-col border-r px-4 py-5 md:flex"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-2.5 px-2 pb-6">
        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] text-white" style={{ background: "var(--accent)" }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" /></svg>
        </span>
        <span className="text-base font-semibold tracking-tight">planizmo</span>
      </div>

      <nav className="flex flex-col gap-[3px]">
        {ITEMS.map((it) => {
          const on = active(pathname, it.href);
          return (
            <Link
              key={it.label}
              href={it.href}
              className="flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-sm"
              style={{
                color: on ? "var(--accent)" : "var(--text)",
                background: on ? "color-mix(in srgb, var(--accent) 11%, transparent)" : "transparent",
                fontWeight: on ? 600 : 500,
              }}
            >
              <span className="flex h-5 w-5 flex-none items-center justify-center">{it.icon}</span>
              {it.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={openAssistant}
          className="flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-left text-sm"
          style={{ color: "var(--text)", fontWeight: 500, cursor: "pointer" }}
        >
          <span className="flex h-5 w-5 flex-none items-center justify-center">{I.ai}</span>
          AI assistant
        </button>
      </nav>

      <div className="flex-1" />

      <Link href="/dashboard/settings" className="flex items-center gap-2.5 rounded-[11px] px-2 py-2.5" style={{ cursor: "pointer" }}>
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[13px] font-semibold" style={{ background: "var(--surface2)", color: "var(--accent)" }}>
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="flex-1 truncate text-sm font-medium">{name}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" {...S} stroke="var(--muted)"><path d="M6 9l6 6 6-6" /></svg>
      </Link>
      <div className="mx-1 my-2.5 h-px" style={{ background: "var(--border)" }} />
      <Link href="/dashboard/settings" className="flex items-center gap-3 px-2 py-2.5 text-sm" style={{ color: "var(--muted)" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8 2 2 0 1 1-2.8 2.8 1.6 1.6 0 0 0-2.8 1.1 2 2 0 1 1-4 0 1.6 1.6 0 0 0-2.8-1.1 2 2 0 1 1-2.8-2.8A1.6 1.6 0 0 0 4.6 15a2 2 0 1 1 0-4 1.6 1.6 0 0 0 1.1-2.8 2 2 0 1 1 2.8-2.8A1.6 1.6 0 0 0 11.3 4.6a2 2 0 1 1 4 0 1.6 1.6 0 0 0 2.8 1.1 2 2 0 1 1 2.8 2.8A1.6 1.6 0 0 0 19.4 11a2 2 0 1 1 0 4z" /></svg>
        Settings
      </Link>
      <button type="button" onClick={openAssistant} className="flex items-center gap-3 px-2 py-2.5 text-left text-sm" style={{ color: "var(--muted)", cursor: "pointer" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="9" /><path d="M9.2 9a2.8 2.8 0 0 1 5.4 1c0 1.9-2.8 2.8-2.8 2.8M12 17h.01" /></svg>
        Help &amp; feedback
      </button>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-10 flex border-t md:hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      {ITEMS.map((it) => {
        const on = active(pathname, it.href);
        return (
          <Link key={it.label} href={it.href} className="flex flex-1 flex-col items-center gap-1 py-2.5" style={{ color: on ? "var(--accent)" : "var(--muted)" }}>
            {it.icon}
            <span className="text-[10px]" style={{ fontWeight: on ? 500 : 400 }}>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function SignOutButton({ variant = "pill" }: { variant?: "pill" | "row" }) {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className={
          variant === "row"
            ? "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm"
            : "rounded-full border px-3.5 py-1.5 text-[13px]"
        }
        style={{ borderColor: "var(--border)", color: "var(--muted)", cursor: "pointer" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" {...S}><path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" /><path d="M10 17l5-5-5-5M15 12H3" /></svg>
        Sign out
      </button>
    </form>
  );
}

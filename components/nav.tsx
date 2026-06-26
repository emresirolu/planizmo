"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";

type Item = {
  href: string;
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
};

const items: Item[] = [
  {
    href: "/dashboard",
    label: "Home",
    enabled: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
        <path d="M9.5 21v-6h5v6" />
      </svg>
    ),
  },
  {
    href: "#",
    label: "Calendar",
    enabled: false,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
        <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
      </svg>
    ),
  },
  {
    href: "#",
    label: "Insights",
    enabled: false,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V4M4 20h16" />
        <path d="M8 16v-4M13 16V8M18 16v-7" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    enabled: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h9M18 7h2M4 12h2M11 12h9M4 17h7M16 17h4" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="9" cy="12" r="2" />
        <circle cx="14" cy="17" r="2" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string, enabled: boolean): boolean {
  if (!enabled) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

/** Bottom tab bar — mobile only. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="sticky bottom-0 z-10 flex border-t md:hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href, item.enabled);
        const inner = (
          <span
            className="flex flex-1 flex-col items-center gap-1 py-3"
            style={{
              color: active ? "var(--accent)" : "var(--muted)",
              opacity: item.enabled ? 1 : 0.45,
            }}
          >
            {item.icon}
            <span className="text-[11px]" style={{ fontWeight: active ? 500 : 400 }}>
              {item.label}
            </span>
          </span>
        );
        return item.enabled ? (
          <Link key={item.label} href={item.href} className="flex flex-1">
            {inner}
          </Link>
        ) : (
          <span key={item.label} className="flex flex-1 cursor-default" aria-disabled title="Coming soon">
            {inner}
          </span>
        );
      })}
    </nav>
  );
}

/** Left sidebar — desktop (md+) only. */
export function SideNav() {
  const pathname = usePathname();
  return (
    <aside
      className="sticky top-0 hidden h-dvh w-60 flex-none flex-col border-r px-3 py-5 md:flex"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
          style={{ background: "var(--accent)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" />
          </svg>
        </span>
        <span className="text-[15px] font-medium tracking-tight">planizmo</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href, item.enabled);
          const inner = (
            <span
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors"
              style={{
                color: active ? "var(--accent)" : "var(--muted)",
                background: active ? "var(--surface2)" : "transparent",
                fontWeight: active ? 500 : 400,
                opacity: item.enabled ? 1 : 0.45,
              }}
            >
              {item.icon}
              {item.label}
            </span>
          );
          return item.enabled ? (
            <Link key={item.label} href={item.href}>
              {inner}
            </Link>
          ) : (
            <span key={item.label} className="cursor-default" aria-disabled title="Coming soon">
              {inner}
            </span>
          );
        })}
      </nav>

      <SignOutButton variant="sidebar" />
    </aside>
  );
}

export function SignOutButton({
  variant = "pill",
}: {
  variant?: "pill" | "sidebar";
}) {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className={
          variant === "sidebar"
            ? "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors"
            : "rounded-full border px-3.5 py-1.5 text-[13px] transition-colors"
        }
        style={
          variant === "sidebar"
            ? { color: "var(--muted)", cursor: "pointer" }
            : {
                borderColor: "var(--border)",
                color: "var(--muted)",
                cursor: "pointer",
              }
        }
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" />
          <path d="M10 17l5-5-5-5M15 12H3" />
        </svg>
        Sign out
      </button>
    </form>
  );
}

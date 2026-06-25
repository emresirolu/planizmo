"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky bottom-0 flex border-t"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {items.map((item) => {
        const active = item.enabled && pathname === item.href;
        const color = active ? "var(--accent)" : "var(--muted)";
        const inner = (
          <span
            className="flex flex-1 flex-col items-center gap-1 py-3"
            style={{ color, opacity: item.enabled ? 1 : 0.45 }}
          >
            {item.icon}
            <span
              className="text-[11px]"
              style={{ fontWeight: active ? 500 : 400 }}
            >
              {item.label}
            </span>
          </span>
        );
        return item.enabled ? (
          <Link key={item.label} href={item.href} className="flex flex-1">
            {inner}
          </Link>
        ) : (
          <span
            key={item.label}
            className="flex flex-1 cursor-default"
            aria-disabled
            title="Coming soon"
          >
            {inner}
          </span>
        );
      })}
    </nav>
  );
}

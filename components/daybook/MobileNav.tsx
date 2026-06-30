"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeItem, ICONS, NAV } from "./nav";

export default function MobileNav() {
  const pathname = usePathname();
  const current = activeItem(pathname);
  return (
    <nav
      className="sticky bottom-0 z-10 flex overflow-x-auto md:hidden"
      style={{ background: "var(--surface2)", borderTop: "1px solid var(--border)" }}
    >
      {NAV.map((n) => {
        const on = n.href === current.href;
        return (
          <Link key={n.href} href={n.href} className="flex min-w-[68px] flex-1 flex-col items-center gap-1 py-2" style={{ color: on ? "var(--accent)" : "var(--faint)" }}>
            <span className="flex h-[18px] w-[18px] items-center justify-center">{ICONS[n.icon]}</span>
            <span className="text-[10px]" style={{ fontWeight: on ? 600 : 500 }}>{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

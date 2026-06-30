"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { activeItem } from "./nav";

export default function Header() {
  const pathname = usePathname();
  const current = activeItem(pathname);
  const [now, setNow] = useState<{ time: string; date: string } | null>(null);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow({
        time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        date: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase(),
      });
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      id="pzHead"
      className="flex flex-wrap items-center justify-between gap-5 px-[18px] py-[15px] md:px-[30px] md:py-[19px]"
      style={{ borderBottom: "1px solid var(--border)", background: "var(--paper)" }}
    >
      <div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500, letterSpacing: ".16em", color: "var(--faint)", whiteSpace: "nowrap" }}>{current.kicker}</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, letterSpacing: "-.01em", marginTop: 3 }}>{current.title}</div>
      </div>
      <div className="flex items-center gap-[11px]">
        <Link
          href="/dashboard/operator"
          id="pzSearch"
          className="hidden items-center gap-[9px] rounded-[9px] px-3 py-[9px] sm:flex"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", width: 230, color: "var(--faint)" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <span className="flex-1 text-[13px]">Search or ask Planizmo</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, border: "1px solid var(--border)", borderRadius: 4, padding: "1px 5px" }}>⌘K</span>
        </Link>
        {now && (
          <div className="text-right">
            <div className="text-[13px] font-semibold">{now.time}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)" }}>{now.date}</div>
          </div>
        )}
      </div>
    </div>
  );
}

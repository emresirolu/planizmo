"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { activeItem, ICONS, NAV } from "./nav";

function openCapture() {
  window.dispatchEvent(new Event("planizmo:capture"));
}

export default function Sidebar({ name }: { name: string }) {
  const pathname = usePathname();
  const current = activeItem(pathname);

  return (
    <aside
      id="pzSide"
      className="hidden w-[232px] flex-none flex-col px-[14px] py-5 md:flex"
      style={{ background: "var(--surface2)", borderRight: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-[11px] px-[9px] pb-[22px] pt-1">
        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[8px]" style={{ background: "var(--accent)", color: "#F4EEE2" }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5.4c3-1.1 6-1.1 9 0v13.2c-3-1.1-6-1.1-9 0zM21 5.4c-3-1.1-6-1.1-9 0v13.2c3-1.1 6-1.1 9 0z" /></svg>
        </span>
        <span style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 500, letterSpacing: "-.01em" }}>planizmo</span>
      </div>

      <div className="px-[10px] pb-[10px]" style={{ fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500, letterSpacing: ".16em", color: "var(--faint)" }}>WORKSPACE</div>
      <nav className="flex flex-col gap-[2px]">
        {NAV.map((n) => {
          const on = n.href === current.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-[11px] rounded-[8px] px-[11px] py-[9px]"
              style={{
                background: on ? "var(--surface)" : "transparent",
                boxShadow: on ? "inset 2px 0 0 var(--accent)" : "none",
                color: on ? "var(--ink)" : "var(--muted)",
              }}
            >
              <span className="flex h-[19px] w-[19px] flex-none items-center justify-center" style={{ color: on ? "var(--accent)" : "var(--faint)" }}>{ICONS[n.icon]}</span>
              <span style={{ fontSize: 14, fontWeight: on ? 600 : 500, letterSpacing: "-.01em" }} className="flex-1">{n.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <button
        type="button"
        onClick={openCapture}
        className="mb-[14px] flex items-center gap-[10px] rounded-[9px] px-[13px] py-[11px]"
        style={{ background: "var(--accent)", color: "#F6F1E6", cursor: "pointer" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        <span style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-.01em" }}>Quick capture</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10, opacity: 0.7, marginLeft: "auto" }}>⌘N</span>
      </button>

      <div className="flex items-center gap-[10px] rounded-[9px] p-[9px]" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
        <Link href="/dashboard/settings" className="flex min-w-0 flex-1 items-center gap-[10px]" style={{ textDecoration: "none", color: "var(--ink)" }}>
          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[7px] text-[12px] font-semibold" style={{ background: "var(--accent)", color: "#F6F1E6" }}>{name.charAt(0).toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold" style={{ letterSpacing: "-.01em" }}>{name}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--faint)", letterSpacing: ".04em" }}>SETTINGS</div>
          </div>
        </Link>
        <form action={signOutAction}>
          <button type="submit" aria-label="Sign out" style={{ color: "var(--faint)", cursor: "pointer", display: "flex" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 17l5-5-5-5M15 12H3" /></svg>
          </button>
        </form>
      </div>
    </aside>
  );
}

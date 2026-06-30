import Link from "next/link";
import type { ReactNode } from "react";

export const CONTACT_EMAIL = "emrecanoyunlar@gmail.com";

export default function LegalPage({
  kicker,
  title,
  updated,
  intro,
  sections,
  otherHref,
  otherLabel,
}: {
  kicker: string;
  title: string;
  updated: string;
  intro: string;
  sections: { h: string; body: ReactNode }[];
  otherHref: string;
  otherLabel: string;
}) {
  return (
    <main className="pz-paper min-h-dvh" style={{ background: "var(--canvas)" }}>
      <div className="mx-auto max-w-[760px] px-6 py-10 md:py-14">
        <Link href="/" className="flex items-center gap-[10px]" style={{ textDecoration: "none", color: "var(--ink)" }}>
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px]" style={{ background: "var(--accent)", color: "#F6F1E6" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5.4c3-1.1 6-1.1 9 0v13.2c-3-1.1-6-1.1-9 0zM21 5.4c-3-1.1-6-1.1-9 0v13.2c3-1.1 6-1.1 9 0z" /></svg>
          </span>
          <span style={{ fontFamily: "var(--serif)", fontSize: 19, fontWeight: 500 }}>planizmo</span>
        </Link>

        <div className="mt-9" style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".18em", color: "var(--accent)" }}>{kicker}</div>
        <h1 className="mt-3" style={{ fontFamily: "var(--serif)", fontSize: 38, fontWeight: 600, letterSpacing: "-.02em" }}>{title}</h1>
        <div className="mt-2" style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--faint)", letterSpacing: ".04em" }}>{updated}</div>
        <p className="mt-5 text-[15px] leading-relaxed" style={{ color: "var(--muted)" }}>{intro}</p>

        <div className="mt-8 flex flex-col gap-7">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="pb-2" style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 600, borderBottom: "1px solid var(--rule)" }}>{s.h}</h2>
              <div className="mt-3 text-[14.5px] leading-relaxed" style={{ color: "var(--ink)" }}>{s.body}</div>
            </section>
          ))}
        </div>

        <div className="mt-10 border-t pt-6" style={{ borderColor: "var(--border)" }}>
          <div className="text-[14px]" style={{ color: "var(--muted)" }}>
            Questions? Contact <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--accent)", fontWeight: 600 }}>{CONTACT_EMAIL}</a>.
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-[13px]">
            <Link href={otherHref} style={{ color: "var(--accent)" }}>{otherLabel}</Link>
            <Link href="/" style={{ color: "var(--muted)" }}>Back to home</Link>
            <Link href="/signin" style={{ color: "var(--muted)" }}>Sign in</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

/** Shared bullet list with the daybook rule style. */
export function L({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-[9px] h-[5px] w-[5px] flex-none rounded-full" style={{ background: "var(--accent)" }} />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

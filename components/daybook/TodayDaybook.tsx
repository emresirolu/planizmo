"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleEventCompleteAction } from "@/lib/actions/calendar";
import { fmtTime, type ClientEvent } from "@/lib/calendar/types";

export type GlanceItem = { label: string; value: string; accent?: boolean };

export default function TodayDaybook({
  summary,
  glance,
  blocks,
  nextId,
  marginNote,
  tomorrow,
}: {
  summary: string;
  glance: GlanceItem[];
  blocks: ClientEvent[];
  nextId: string | null;
  marginNote: string;
  tomorrow: { id: string; title: string; startTime: string | null }[];
}) {
  const router = useRouter();
  const [, start] = useTransition();

  function toggle(e: ClientEvent) {
    start(async () => {
      await toggleEventCompleteAction(e.id, !e.completed);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-9 px-6 pb-10 pt-[26px] md:px-8">
      {/* main column */}
      <div className="min-w-0 flex-1">
        <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", color: "var(--muted)", marginBottom: 11 }}>{summary}</div>

        <div className="mb-4 flex items-center gap-[9px] overflow-x-auto" style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--faint)", letterSpacing: ".03em" }}>
          {glance.map((g, i) => (
            <span key={g.label} className="flex items-center gap-[9px]">
              <span className="whitespace-nowrap">{g.label} <span style={{ color: g.accent ? "var(--accent)" : "var(--ink)" }}>{g.value}</span></span>
              {i < glance.length - 1 && <span style={{ color: "var(--rule)" }}>·</span>}
            </span>
          ))}
        </div>

        {blocks.length === 0 ? (
          <div className="rounded-[12px] border px-5 py-10 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 18 }}>Your day is open.</div>
            <p className="mx-auto mt-1 max-w-xs text-[13px]" style={{ color: "var(--muted)" }}>Add a time block, or ask the Operator to lay out your day.</p>
            <Link href="/dashboard/calendar?v=day" className="mt-3 inline-block rounded-[8px] px-4 py-2 text-[13px] font-semibold" style={{ background: "var(--accent)", color: "#F6F1E6" }}>Plan today</Link>
          </div>
        ) : (
          <div style={{ borderTop: "2px solid var(--ink)" }}>
            {blocks.map((b) => {
              const isNext = b.id === nextId;
              const done = b.completed;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggle(b)}
                  className="flex w-full gap-4 px-0.5 py-[13px] text-left"
                  style={{ borderBottom: "1px dotted var(--rule)", cursor: "pointer" }}
                >
                  <div className="flex-none pt-[5px] text-right" style={{ width: 54, fontFamily: "var(--mono)", fontSize: 11.5, color: isNext ? "var(--ink)" : "var(--faint)", fontWeight: isNext ? 600 : 400, letterSpacing: "-.02em" }}>
                    {b.startTime ? fmtTime(b.startTime) : "—"}
                  </div>
                  <div className="flex-none pt-[7px]">
                    <span className="block h-[10px] w-[10px] rounded-full" style={{ background: done ? "#BDB196" : isNext ? "var(--accent)" : "transparent", border: done || isNext ? "none" : "2px solid var(--rule)" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-[10px]">
                      <span style={{ fontFamily: "var(--serif)", fontSize: 18, letterSpacing: "-.01em", color: done ? "var(--faint)" : "var(--ink)", textDecoration: done ? "line-through" : "none" }}>{b.title}</span>
                      {isNext && <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".1em", color: "#F6F1E6", background: "var(--accent)", padding: "2px 7px", borderRadius: 4 }}>UP NEXT</span>}
                    </div>
                    {b.endTime && <div className="mt-px text-[12.5px] italic" style={{ color: "var(--muted)" }}>until {fmtTime(b.endTime)}</div>}
                  </div>
                  <div className="flex-none self-center" style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".08em", color: "var(--faint)" }}>{b.type.toUpperCase()}</div>
                </button>
              );
            })}
          </div>
        )}

        <Link href="/dashboard/calendar?v=day" className="flex items-center gap-2 px-0.5 py-[15px]" style={{ color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".04em" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          ADD TIME BLOCK
        </Link>
      </div>

      {/* margin column */}
      <div className="flex w-full flex-none flex-col gap-[18px] md:w-[250px] md:border-l md:pl-[26px]" style={{ borderColor: "var(--border)" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".16em", color: "var(--faint)" }}>IN THE MARGIN</div>
        <div style={{ fontFamily: "var(--hand)", fontSize: 21, lineHeight: 1.2, color: "var(--accent)" }}>{marginNote}</div>
        <div className="rounded-[11px] border p-[15px]" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="flex items-center gap-[7px]">
            <span className="flex" style={{ color: "var(--accent)" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" /></svg></span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".12em", color: "var(--faint)" }}>PLANIZMO</span>
          </div>
          <div className="mt-[9px] text-[13.5px] leading-[1.5]">Ask the Operator to plan your day, rebalance blocks, or log what you did.</div>
          <Link href="/dashboard/operator" className="mt-3 inline-block rounded-[6px] px-3 py-[6px] text-[12px] font-semibold" style={{ background: "var(--accent)", color: "#F6F1E6" }}>Open Operator</Link>
        </div>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".14em", color: "var(--faint)" }}>TOMORROW</div>
          {tomorrow.length === 0 ? (
            <div className="mt-2 text-[13px] italic" style={{ color: "var(--muted)", fontFamily: "var(--serif)" }}>Nothing scheduled yet.</div>
          ) : (
            tomorrow.map((t) => (
              <div key={t.id} className="mt-2 text-[13px] italic" style={{ color: "var(--muted)", fontFamily: "var(--serif)" }}>
                {t.title}{t.startTime ? ` · ${fmtTime(t.startTime)}` : ""}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

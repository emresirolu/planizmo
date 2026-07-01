"use client";

import { useState } from "react";

type Props = {
  link: string;
  completed: number;
  towardNext: number;
  perMilestone: number;
  monthsEarned: number;
  atCap: boolean;
};

export default function InviteFriends({
  link,
  completed,
  towardNext,
  perMilestone,
  monthsEarned,
  atCap,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Fallback for browsers without the async clipboard API.
      const el = document.createElement("textarea");
      el.value = link;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand("copy");
      } catch {
        /* nothing more we can do */
      }
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const segments = Array.from({ length: perMilestone }, (_, i) => i < towardNext);

  return (
    <div
      className="rounded-[14px] border p-4"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[14px] font-medium">Invite friends</div>
          <div className="mt-0.5 text-[12.5px] leading-relaxed" style={{ color: "var(--muted)" }}>
            Friends who join through your link get 7 days of Pro. Every {perMilestone} friends
            who finish setup earns you a free month.
          </div>
        </div>
      </div>

      {/* Referral link + copy */}
      <div className="mt-3.5 flex flex-col gap-2 sm:flex-row">
        <div
          className="min-w-0 flex-1 truncate rounded-[10px] border px-3 py-2.5 text-[13px]"
          style={{ background: "var(--paper)", borderColor: "var(--border)", color: "var(--ink)", fontFamily: "var(--mono)" }}
          title={link}
        >
          {link.replace(/^https?:\/\//, "")}
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex-none rounded-[10px] px-4 py-2.5 text-[13px] font-semibold"
          style={{ background: "var(--accent)", color: "#F6F1E6", cursor: "pointer" }}
          aria-live="polite"
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
      </div>

      {/* Progress */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".14em", color: "var(--faint)" }}>
            REFERRALS
          </span>
          <span className="text-[12.5px]" style={{ color: "var(--muted)" }}>
            {atCap ? `${completed} joined` : `${towardNext} / ${perMilestone} toward next month`}
          </span>
        </div>
        <div className="mt-2 flex gap-1.5" aria-hidden>
          {segments.map((on, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full"
              style={{ background: on ? "var(--accent)" : "var(--border)" }}
            />
          ))}
        </div>
        <div className="mt-2.5 text-[12.5px]" style={{ color: "var(--muted)" }}>
          {completed === 0
            ? "No referrals yet — share your link to get started."
            : `${completed} friend${completed === 1 ? "" : "s"} joined` +
              (monthsEarned > 0
                ? ` · ${monthsEarned} free month${monthsEarned === 1 ? "" : "s"} earned`
                : "")}
          {atCap && " · you've reached the referral reward cap"}
        </div>
      </div>
    </div>
  );
}

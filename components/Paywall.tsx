"use client";

import { useEffect, useState } from "react";
import { PRICING } from "@/lib/billing/plan";

type Config = {
  enabled: boolean;
  clientToken: string | null;
  environment: "sandbox" | "production";
  priceMonthly: string | null;
  priceAnnual: string | null;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Paddle?: any;
  }
}

const FEATURES = [
  "Unlimited AI weekly planning + plan-my-day, replan & next move",
  "Timeline mode (hour-by-hour day)",
  "Health auto-sync (Fitbit / Google Health)",
  "All 6 themes + custom accent",
  "Full drag & resize customization",
  "Streak freezes + unlimited goals",
];

export default function Paywall({
  config,
  userId,
  realPro,
  promo,
  promoUntil,
}: {
  config: Config;
  userId: string;
  realPro: boolean;
  promo: boolean;
  promoUntil: string | null;
}) {
  const [plan, setPlan] = useState<"annual" | "monthly">("annual");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!config.enabled || !config.clientToken) return;
    const init = () => {
      try {
        window.Paddle?.Environment?.set(config.environment);
        window.Paddle?.Initialize({ token: config.clientToken });
        setReady(true);
      } catch {
        setError("Couldn't initialize checkout.");
      }
    };
    if (window.Paddle) return init();
    const s = document.createElement("script");
    s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    s.async = true;
    s.onload = init;
    s.onerror = () => setError("Couldn't load checkout.");
    document.body.appendChild(s);
  }, [config]);

  function buy() {
    const priceId = plan === "annual" ? config.priceAnnual : config.priceMonthly;
    if (!ready || !priceId) return;
    try {
      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customData: { user_id: userId },
        settings: { displayMode: "overlay" },
      });
    } catch {
      setError("Couldn't open checkout.");
    }
  }

  if (realPro) {
    return (
      <div className="rounded-[18px] border p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="text-[15px] font-semibold">You're on Planizmo Pro</div>
        <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--muted)" }}>
          Everything's unlocked — timeline, unlimited AI planning, health sync, all themes, and full customization. Thanks for supporting Planizmo.
        </p>
      </div>
    );
  }

  const card = (key: "annual" | "monthly") => {
    const p = PRICING[key];
    const selected = plan === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => setPlan(key)}
        className="relative flex-1 rounded-2xl p-4 text-left"
        style={{
          border: `2px solid ${selected ? "var(--accent)" : "var(--border)"}`,
          background: selected ? "color-mix(in srgb, var(--accent) 9%, var(--surface))" : "var(--surface)",
          cursor: "pointer",
        }}
      >
        {key === "annual" && (
          <span className="absolute -top-2.5 left-4 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: "var(--accent)" }}>
            best value · {p.note}
          </span>
        )}
        <div className="mt-1.5 text-[13px] capitalize" style={{ color: "var(--muted)" }}>{key}</div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-2xl font-medium">{p.amount}</span>
          <span className="text-[13px]" style={{ color: "var(--muted)" }}>{p.period}</span>
        </div>
        <div className="mt-0.5 text-[12px]" style={{ color: "var(--muted)" }}>{key === "annual" ? p.per : p.note}</div>
      </button>
    );
  };

  return (
    <div className="rounded-[18px] border p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: "var(--accent)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" /></svg>
        </span>
        <div>
          <div className="text-[17px] font-medium tracking-tight">Unlock Planizmo Pro</div>
          <div className="text-[13px]" style={{ color: "var(--muted)" }}>The calmest planner, set up by AI — for the price of a coffee.</div>
        </div>
      </div>

      {promo && (
        <div className="mt-4 rounded-xl px-3.5 py-2.5 text-[13px]" style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)" }}>
          You've got Pro free until {promoUntil ?? "the promo ends"} — pick a plan now to keep it after.
        </div>
      )}

      <div className="mt-5 flex gap-3">{card("annual")}{card("monthly")}</div>

      <ul className="mt-5 flex flex-col gap-2.5">
        {FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[13.5px]">
            <span className="mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--success) 16%, transparent)", color: "var(--success)" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </span>
            {f}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={buy}
        disabled={!config.enabled || !ready}
        className="mt-5 w-full rounded-2xl px-4 py-3.5 text-[15px] font-medium text-white disabled:opacity-60"
        style={{ background: "var(--accent)", cursor: config.enabled ? "pointer" : "not-allowed" }}
      >
        {plan === "annual" ? "Start annual — $20/yr" : "Start monthly — $3/mo"}
      </button>

      {!config.enabled && (
        <p className="mt-2.5 text-center text-[12px]" style={{ color: "var(--muted)" }}>
          Checkout is unavailable in this environment (Paddle keys not configured). The paywall is shown for preview.
        </p>
      )}
      {error && <p className="mt-2.5 text-center text-[12px]" style={{ color: "var(--alert)" }}>{error}</p>}
      <p className="mt-2 text-center text-[11px]" style={{ color: "var(--muted)" }}>Test mode · Paddle handles billing. Cancel anytime.</p>
    </div>
  );
}

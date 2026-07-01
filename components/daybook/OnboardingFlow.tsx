"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateDaybookAction } from "@/lib/actions/onboarding";
import { COACH_OPTS, ENERGY_OPTS, LIFE_AREAS } from "@/lib/onboarding/generate";

const KICK = ["", "STEP 1 OF 5 · LIFE AREAS", "STEP 2 OF 5 · GOALS", "STEP 3 OF 5 · YOUR WEEK", "STEP 4 OF 5 · ENERGY", "STEP 5 OF 5 · COACHING"];
const TITLE = ["", "Which parts of life are we planning?", "What are 1–3 things you want to improve?", "What does a normal week look like?", "When are you at your best?", "How should Planizmo talk to you?"];
const GOAL_PH = ["e.g. Ship Planizmo v1", "e.g. Run a half-marathon", "e.g. Read 12 books"];
const SUGGESTED = [
  ["09:00", "Deep work · session 1"],
  ["13:00", "Goal block · top mission"],
  ["18:00", "Gym · upper body"],
  ["21:00", "Read · 20 min"],
];

export default function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [areas, setAreas] = useState<string[]>([]);
  const [goals, setGoals] = useState(["", "", ""]);
  const [routine, setRoutine] = useState("");
  const [energy, setEnergy] = useState("Morning");
  const [coaching, setCoaching] = useState("Direct");
  const [pending, start] = useTransition();
  const [ready, setReady] = useState<{ goals: string[]; trackers: string[]; metrics: string[] } | null>(null);
  const [trialDays, setTrialDays] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function toggleArea(a: string) {
    setAreas((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]));
  }
  function build() {
    setErr(null);
    start(async () => {
      const res = await generateDaybookAction({ areas, goals, routine, energy, coaching });
      if (res.ok) { setReady({ goals: res.goals, trackers: res.trackers, metrics: res.metrics }); setTrialDays(res.referralTrialDays); setStep(6); }
      else setErr(res.error);
    });
  }
  function next() { if (step === 5) build(); else setStep((s) => Math.min(6, s + 1)); }
  function back() { setStep((s) => Math.max(1, s - 1)); }

  const chip = (on: boolean) => ({
    fontSize: 14, padding: "10px 16px", borderRadius: 999, cursor: "pointer",
    border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
    background: on ? "var(--accent)" : "var(--paper)", color: on ? "#F6F1E6" : "var(--ink)",
  });
  const opt = (on: boolean) => ({
    border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`, borderRadius: 11, padding: 16, cursor: "pointer",
    background: on ? "color-mix(in srgb, var(--accent) 9%, transparent)" : "var(--paper)",
    boxShadow: on ? "inset 0 0 0 1px var(--accent)" : "none",
  });
  const inputSty = { width: "100%", border: "1px solid var(--border)", background: "var(--paper)", borderRadius: 9, padding: "12px 14px", fontSize: 14, color: "var(--ink)", fontFamily: "var(--serif)" } as const;

  return (
    <div className="pz-paper min-h-dvh" style={{ background: "var(--canvas)" }}>
      <div className="flex items-center justify-center gap-[10px] pt-[26px]">
        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px]" style={{ background: "var(--accent)", color: "#F6F1E6" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5.4c3-1.1 6-1.1 9 0v13.2c-3-1.1-6-1.1-9 0zM21 5.4c-3-1.1-6-1.1-9 0v13.2c3-1.1 6-1.1 9 0z" /></svg></span>
        <span style={{ fontFamily: "var(--serif)", fontSize: 19, fontWeight: 500 }}>planizmo</span>
      </div>

      {step <= 5 ? (
        <div className="flex justify-center px-[22px] pb-[50px] pt-[30px]">
          <div className="w-[600px] max-w-full rounded-[16px] p-[30px_32px_26px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 24px 60px rgba(70,55,30,.12)" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".16em", color: "var(--accent)" }}>MAKE THIS DAYBOOK YOURS</div>
            <div className="mt-[14px] flex gap-[6px]">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? "var(--accent)" : "var(--border)" }} />)}
            </div>
            <div className="mt-[14px]" style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".14em", color: "var(--faint)" }}>{KICK[step]}</div>
            <div className="mt-2" style={{ fontFamily: "var(--serif)", fontSize: 27, fontWeight: 600, letterSpacing: "-.01em", lineHeight: 1.15 }}>{TITLE[step]}</div>

            {step === 1 && (
              <>
                <div className="mt-2 text-[13.5px] leading-[1.5]" style={{ color: "var(--muted)" }}>Pick the areas you want Planizmo to plan around. Hobbies become goals, trackers, and blocks — not extra tabs.</div>
                <div className="mt-5 flex flex-wrap gap-[9px]">
                  {LIFE_AREAS.map((a) => <span key={a} onClick={() => toggleArea(a)} style={chip(areas.includes(a))}>{a}</span>)}
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <div className="mt-2 text-[13.5px] leading-[1.5]" style={{ color: "var(--muted)" }}>Name up to three. Each becomes a mission with milestones and scheduled blocks.</div>
                <div className="mt-5 flex flex-col gap-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i}>
                      <div className="mb-1.5" style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".12em", color: "var(--faint)" }}>GOAL {i + 1}</div>
                      <input className="pz-in" value={goals[i]} onChange={(e) => setGoals((g) => g.map((x, j) => (j === i ? e.target.value : x)))} placeholder={GOAL_PH[i]} style={inputSty} />
                    </div>
                  ))}
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <div className="mt-2 text-[13.5px] leading-[1.5]" style={{ color: "var(--muted)" }}>A rough sketch is enough — Planizmo finds the open space for your goals.</div>
                <textarea className="pz-in mt-[18px]" value={routine} onChange={(e) => setRoutine(e.target.value)} placeholder="e.g. Weekdays 9–5 work, gym most evenings, weekends freer…" style={{ ...inputSty, height: 96, resize: "none" }} />
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Weekdays 9–5", "Evenings free", "Long weekend sessions"].map((l) => (
                    <span key={l} onClick={() => setRoutine((r) => (r ? r + " · " : "") + l)} style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 7, padding: "7px 11px", cursor: "pointer" }}>{l}</span>
                  ))}
                </div>
              </>
            )}
            {step === 4 && (
              <>
                <div className="mt-2 text-[13.5px] leading-[1.5]" style={{ color: "var(--muted)" }}>Planizmo protects your best hours for deep work.</div>
                <div className="mt-5 grid gap-[10px]" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))" }}>
                  {ENERGY_OPTS.map((e) => <div key={e} onClick={() => setEnergy(e)} style={{ ...opt(energy === e), textAlign: "center" }}><div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 600 }}>{e}</div></div>)}
                </div>
              </>
            )}
            {step === 5 && (
              <>
                <div className="mt-2 text-[13.5px] leading-[1.5]" style={{ color: "var(--muted)" }}>Sets the tone of Operator, Think, and your reviews.</div>
                <div className="mt-5 flex flex-col gap-[10px]">
                  {COACH_OPTS.map(([l, d]) => <div key={l} onClick={() => setCoaching(l)} style={opt(coaching === l)}><div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 600 }}>{l}</div><div className="mt-0.5 text-[12.5px]" style={{ color: "var(--muted)" }}>{d}</div></div>)}
                </div>
              </>
            )}

            {err && <div className="mt-3 text-[12.5px]" style={{ color: "var(--alert)" }}>{err}</div>}

            <div className="mt-7 flex items-center justify-between border-t pt-[18px]" style={{ borderColor: "var(--border)" }}>
              <button type="button" onClick={back} className="px-1.5 py-[11px] text-[14px]" style={{ color: "var(--muted)", cursor: "pointer", visibility: step === 1 ? "hidden" : "visible" }}>Back</button>
              <button type="button" onClick={next} disabled={pending} className="flex items-center gap-2 rounded-[9px] px-5 py-[11px] text-[14px] font-semibold disabled:opacity-60" style={{ background: "var(--accent)", color: "#F6F1E6", cursor: "pointer" }}>
                {pending ? "Building…" : step === 5 ? "Build my daybook" : "Continue"}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        ready && (
          <div className="flex justify-center px-[22px] pb-[50px] pt-[30px]">
            <div className="w-[720px] max-w-full">
              <div className="text-center">
                <div className="mx-auto flex h-[50px] w-[50px] items-center justify-center rounded-[13px]" style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></div>
                <div className="mt-4" style={{ fontFamily: "var(--serif)", fontSize: 34, fontWeight: 600, letterSpacing: "-.01em" }}>Your daybook is ready.</div>
                <div className="mt-2 text-[14.5px]" style={{ color: "var(--muted)" }}>Here&apos;s what Planizmo set up for you — all editable later.</div>
                {trialDays != null && (
                  <div
                    className="mx-auto mt-4 inline-flex items-center gap-2 rounded-[11px] px-4 py-2.5"
                    style={{ background: "color-mix(in srgb, var(--accent) 12%, var(--surface))", border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    <span className="text-[13.5px] font-medium" style={{ color: "var(--accent)" }}>
                      Your {trialDays}-day Pro trial is unlocked.
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-[26px] grid gap-[14px]" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
                <div className="rounded-[13px] p-[18px]" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".12em", color: "var(--accent)" }}>GOALS</div>
                  <div className="mt-[11px] flex flex-col gap-2">
                    {(ready.goals.length ? ready.goals : ["Your first goal"]).map((g, i) => (
                      <div key={i} className="flex items-center gap-[9px]"><span className="h-[7px] w-[7px] flex-none rounded-full" style={{ background: "var(--accent)" }} /><span style={{ fontFamily: "var(--serif)", fontSize: 15 }}>{g}</span></div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[13px] p-[18px]" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".12em", color: "var(--accent)" }}>TRACKERS</div>
                  <div className="mt-[11px] flex flex-wrap gap-[7px]">
                    {ready.trackers.map((t) => <span key={t} style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 7, padding: "6px 10px" }}>{t}</span>)}
                  </div>
                  <div className="mt-[18px]" style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".12em", color: "var(--accent)" }}>REVIEW METRICS</div>
                  <div className="mt-[11px] flex flex-wrap gap-[7px]">
                    {ready.metrics.map((m) => <span key={m} style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 7, padding: "6px 10px" }}>{m}</span>)}
                  </div>
                </div>
                <div className="rounded-[13px] p-[18px]" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".12em", color: "var(--accent)" }}>SUGGESTED FIRST SCHEDULE</div>
                  <div className="mt-[11px]" style={{ borderTop: "2px solid var(--ink)" }}>
                    {SUGGESTED.map(([t, l], i) => (
                      <div key={t} className="flex gap-3 py-[9px]" style={{ borderBottom: i < 3 ? "1px dotted var(--rule)" : "none" }}><span className="w-[42px] flex-none text-right" style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--faint)" }}>{t}</span><span style={{ fontFamily: "var(--serif)", fontSize: 14.5 }}>{l}</span></div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-[28px] text-center">
                <button type="button" onClick={() => router.push("/dashboard")} className="inline-flex items-center gap-[9px] rounded-[11px] px-[30px] py-[15px] text-[16px] font-bold" style={{ background: "var(--accent)", color: "#F6F1E6", cursor: "pointer" }}>
                  Open Today <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addWorkoutAction } from "@/lib/actions/gym";

type LoggedSet = { exercise: string; weight: string; reps: string };

function mmss(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function ActiveWorkout({ today, weightUnit, onExit }: { today: string; weightUnit: string; onExit: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("Workout");
  const [exercise, setExercise] = useState("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [log, setLog] = useState<LoggedSet[]>([]);
  const [rest, setRest] = useState(0);
  const [running, setRunning] = useState(false);
  const [pending, start] = useTransition();
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (running && rest > 0) {
      timer.current = window.setTimeout(() => setRest((r) => r - 1), 1000);
    } else if (rest === 0) {
      setRunning(false);
    }
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [running, rest]);

  function logSet() {
    if (!exercise.trim()) return;
    setLog((l) => [...l, { exercise: exercise.trim(), weight, reps }]);
    setReps("");
    setRest(90);
    setRunning(true);
  }

  function finish() {
    if (log.length === 0) { onExit(); return; }
    start(async () => {
      await addWorkoutAction({
        date: today,
        name: name.trim() || "Workout",
        sets: log.map((s) => ({ exercise: s.exercise, sets: 1, reps: s.reps, weight: s.weight })),
      });
      router.refresh();
      onExit();
    });
  }

  // group logbook by exercise (most recent first)
  const grouped = log.reduce<Record<string, LoggedSet[]>>((acc, s) => { (acc[s.exercise] ??= []).push(s); return acc; }, {});

  const field = { background: "var(--paper)", border: "1px solid var(--border)", color: "var(--ink)", borderRadius: 9 } as const;

  return (
    <div className="mx-auto max-w-3xl px-6 py-7 md:px-8">
      <div className="flex items-center justify-between">
        <input value={name} onChange={(e) => setName(e.target.value)} className="pz-in min-w-0 flex-1 border-none bg-transparent text-[24px] outline-none" style={{ fontFamily: "var(--serif)", fontWeight: 500, color: "var(--ink)" }} />
        <button type="button" onClick={onExit} className="ml-3 flex-none rounded-full border px-3 py-1.5 text-[12.5px]" style={{ borderColor: "var(--border)", color: "var(--muted)", cursor: "pointer" }}>Exit</button>
      </div>
      <div className="mt-0.5" style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".14em", color: "var(--faint)" }}>ACTIVE WORKOUT · {log.length} {log.length === 1 ? "SET" : "SETS"} LOGGED</div>

      {/* rest timer */}
      <div className="mt-5 flex items-center justify-between rounded-[14px] border p-4" style={{ borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 6%, var(--surface))" }}>
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".12em", color: "var(--accent)" }}>REST TIMER</div>
          <div className="tabular-nums" style={{ fontFamily: "var(--serif)", fontSize: 40, lineHeight: 1 }}>{mmss(rest)}</div>
        </div>
        <div className="flex gap-2">
          {[60, 90, 120].map((s) => <button key={s} type="button" onClick={() => { setRest(s); setRunning(true); }} className="rounded-[8px] border px-3 py-2 text-[12.5px]" style={{ borderColor: "var(--border)", cursor: "pointer" }}>{s}s</button>)}
          <button type="button" onClick={() => setRunning((r) => !r)} className="rounded-[8px] px-3 py-2 text-[12.5px] font-semibold" style={{ background: "var(--accent)", color: "#F6F1E6", cursor: "pointer" }}>{running ? "Pause" : "Start"}</button>
        </div>
      </div>

      {/* set entry */}
      <div className="mt-4 rounded-[14px] border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="grid grid-cols-12 gap-2">
          <input value={exercise} onChange={(e) => setExercise(e.target.value)} placeholder="Exercise" className="pz-in col-span-12 px-3 py-2.5 text-[14px] outline-none sm:col-span-6" style={field} />
          <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" placeholder={weightUnit} className="pz-in col-span-6 px-3 py-2.5 text-[14px] outline-none sm:col-span-3" style={field} />
          <input value={reps} onChange={(e) => setReps(e.target.value)} inputMode="numeric" placeholder="reps" className="pz-in col-span-6 px-3 py-2.5 text-[14px] outline-none sm:col-span-3" style={field} />
        </div>
        <button type="button" onClick={logSet} disabled={!exercise.trim()} className="mt-3 w-full rounded-[9px] py-2.5 text-[14px] font-semibold disabled:opacity-50" style={{ background: "var(--accent)", color: "#F6F1E6", cursor: "pointer" }}>Log set</button>
      </div>

      {/* today's logbook */}
      <div className="mt-5">
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".14em", color: "var(--faint)" }}>TODAY&apos;S LOGBOOK</div>
        {log.length === 0 ? (
          <div className="mt-2 text-[13px] italic" style={{ color: "var(--muted)", fontFamily: "var(--serif)" }}>No sets yet — log your first set above.</div>
        ) : (
          <div className="mt-2" style={{ borderTop: "2px solid var(--ink)" }}>
            {Object.entries(grouped).map(([ex, sets]) => (
              <div key={ex} className="py-2.5" style={{ borderBottom: "1px dotted var(--rule)" }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 16 }}>{ex}</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {sets.map((s, i) => (
                    <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px" }}>
                      {s.weight ? `${s.weight}${weightUnit} ` : ""}× {s.reps || "—"}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button type="button" onClick={finish} disabled={pending} className="rounded-[10px] px-6 py-3 text-[15px] font-bold disabled:opacity-60" style={{ background: "var(--accent)", color: "#F6F1E6", cursor: "pointer" }}>{pending ? "Saving…" : "Finish workout"}</button>
        <span style={{ fontFamily: "var(--hand)", fontSize: 18, color: "var(--accent)" }}>One more rep than last time — that&apos;s the whole game.</span>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TrendChart, { type TrendPoint } from "@/components/TrendChart";
import { addWorkoutAction, deleteWorkoutAction, logBodyMetricAction } from "@/lib/actions/gym";
import { BODY_METRICS, type ClientBodyMetric, type ClientWorkout } from "@/lib/gym/types";

type Section = "overview" | "workouts" | "body" | "coach";
const SECTIONS: { key: Section; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "workouts", label: "Workouts" },
  { key: "body", label: "Body stats" },
  { key: "coach", label: "AI coach" },
];

function fmt(v: number | null, unit = ""): string {
  if (v == null) return "—";
  const n = Math.round(v * 10) / 10;
  return unit ? (unit.length <= 2 ? `${n}${unit}` : `${n} ${unit}`) : String(n);
}

function prettyDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function seriesFor(metrics: ClientBodyMetric[], key: "weight" | "bodyFatPct" | "muscleMass"): TrendPoint[] {
  return metrics
    .filter((m) => m[key] != null)
    .map((m) => ({ date: m.date, value: Number(m[key]) }));
}

export default function GymTab({
  bodyMetrics,
  workouts,
  today,
  weightUnit = "kg",
}: {
  bodyMetrics: ClientBodyMetric[];
  workouts: ClientWorkout[];
  today: string;
  weightUnit?: string;
}) {
  const router = useRouter();
  const [section, setSection] = useState<Section>("overview");

  useEffect(() => {
    const f = () => router.refresh();
    window.addEventListener("planizmo:data-changed", f);
    return () => window.removeEventListener("planizmo:data-changed", f);
  }, [router]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-[28px] font-medium tracking-tight">Gym</h1>

      <div className="mt-4 flex gap-1.5 overflow-x-auto">
        {SECTIONS.map((s) => {
          const on = s.key === section;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setSection(s.key)}
              className="flex-none rounded-full px-3.5 py-1.5 text-[13px] font-medium"
              style={{
                background: on ? "var(--accent)" : "var(--surface2)",
                color: on ? "#fff" : "var(--text)",
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {section === "overview" && <Overview bodyMetrics={bodyMetrics} workouts={workouts} weightUnit={weightUnit} onJump={setSection} />}
        {section === "body" && <BodyStats bodyMetrics={bodyMetrics} today={today} weightUnit={weightUnit} />}
        {section === "workouts" && <Workouts workouts={workouts} today={today} weightUnit={weightUnit} />}
        {section === "coach" && <Coach />}
      </div>
    </div>
  );
}

/* ---------------- Overview ---------------- */

function Overview({
  bodyMetrics,
  workouts,
  weightUnit,
  onJump,
}: {
  bodyMetrics: ClientBodyMetric[];
  workouts: ClientWorkout[];
  weightUnit: string;
  onJump: (s: Section) => void;
}) {
  const latest = [...bodyMetrics].reverse();
  const latestVal = (key: "weight" | "bodyFatPct" | "muscleMass") => latest.find((m) => m[key] != null)?.[key] ?? null;

  // This-week workout count (last 7 days inclusive).
  const weekCount = workouts.filter((w) => {
    const diff = (Date.now() - Date.parse(`${w.date}T00:00:00Z`)) / 86_400_000;
    return diff >= 0 && diff < 7;
  }).length;
  const last = workouts[0] ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {BODY_METRICS.map((bm) => {
          const v = latestVal(bm.key) as number | null;
          return (
            <div key={bm.key} className="rounded-[16px] border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>{bm.label}</div>
              <div className="mt-1 text-[22px] font-semibold tracking-tight">{fmt(v, bm.key === "bodyFatPct" ? "%" : weightUnit)}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-[16px] border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>This week</div>
          <div className="mt-1 text-[22px] font-semibold tracking-tight">{weekCount} {weekCount === 1 ? "workout" : "workouts"}</div>
          <button type="button" onClick={() => onJump("workouts")} className="mt-2 text-[12.5px] font-medium" style={{ color: "var(--accent)", cursor: "pointer" }}>Log a workout →</button>
        </div>
        <div className="rounded-[16px] border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>Last session</div>
          {last ? (
            <>
              <div className="mt-1 text-[15px] font-semibold">{last.name}</div>
              <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>{prettyDate(last.date)}{last.sets.length ? ` · ${last.sets.length} ${last.sets.length === 1 ? "exercise" : "exercises"}` : ""}</div>
            </>
          ) : (
            <div className="mt-1 text-[13px]" style={{ color: "var(--muted)" }}>No workouts logged yet.</div>
          )}
        </div>
      </div>

      <TrendChart data={seriesFor(bodyMetrics, "weight")} label="Weight" unit={weightUnit} direction="neutral" />

      <button type="button" onClick={() => onJump("coach")} className="self-start rounded-full px-4 py-2 text-[13px] font-medium text-white" style={{ background: "var(--accent)", cursor: "pointer" }}>
        Ask the AI coach what to do next
      </button>
    </div>
  );
}

/* ---------------- Body stats ---------------- */

function BodyStats({ bodyMetrics, today, weightUnit }: { bodyMetrics: ClientBodyMetric[]; today: string; weightUnit: string }) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState("");
  const [bf, setBf] = useState("");
  const [muscle, setMuscle] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setErr(null);
    start(async () => {
      const res = await logBodyMetricAction({ date, weight, bodyFatPct: bf, muscleMass: muscle });
      if (res.ok) {
        setWeight(""); setBf(""); setMuscle("");
        router.refresh();
      } else {
        setErr(res.error ?? "Couldn't save.");
      }
    });
  }

  const Field = ({ label, value, onChange, unit }: { label: string; value: string; onChange: (v: string) => void; unit: string }) => (
    <label className="flex flex-col gap-1">
      <span className="text-[12px]" style={{ color: "var(--muted)" }}>{label} <span style={{ opacity: 0.7 }}>({unit})</span></span>
      <input type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder="—"
        className="pz-in rounded-lg border px-2.5 py-2 text-[14px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} />
    </label>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[16px] border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="text-[14px] font-semibold">Log measurements</div>
        <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--muted)" }}>Type the numbers — fill in only what you measured today.</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-[12px]" style={{ color: "var(--muted)" }}>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="pz-in rounded-lg border px-2.5 py-2 text-[14px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} />
          </label>
          <Field label="Weight" value={weight} onChange={setWeight} unit={weightUnit} />
          <Field label="Body fat" value={bf} onChange={setBf} unit="%" />
          <Field label="Muscle" value={muscle} onChange={setMuscle} unit={weightUnit} />
        </div>
        {err && <div className="mt-2 text-[12.5px]" style={{ color: "#d4544f" }}>{err}</div>}
        <button type="button" disabled={pending} onClick={save} className="mt-3 rounded-full px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60" style={{ background: "var(--accent)", cursor: "pointer" }}>
          {pending ? "Saving…" : "Save measurements"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <TrendChart data={seriesFor(bodyMetrics, "weight")} label="Weight" unit={weightUnit} direction="neutral" />
        <TrendChart data={seriesFor(bodyMetrics, "bodyFatPct")} label="Body fat" unit="%" direction="down" />
        <TrendChart data={seriesFor(bodyMetrics, "muscleMass")} label="Muscle" unit={weightUnit} direction="up" />
      </div>
    </div>
  );
}

/* ---------------- Workouts ---------------- */

type SetDraft = { exercise: string; sets: string; reps: string; weight: string };
const emptyRow = (): SetDraft => ({ exercise: "", sets: "", reps: "", weight: "" });

function Workouts({ workouts, today, weightUnit }: { workouts: ClientWorkout[]; today: string; weightUnit: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState(today);
  const [duration, setDuration] = useState("");
  const [rows, setRows] = useState<SetDraft[]>([emptyRow()]);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reset() {
    setName(""); setDate(today); setDuration(""); setRows([emptyRow()]); setErr(null);
  }

  function save() {
    setErr(null);
    start(async () => {
      const res = await addWorkoutAction({
        date,
        name,
        durationMin: duration,
        sets: rows.map((r) => ({ exercise: r.exercise, sets: r.sets, reps: r.reps, weight: r.weight })),
      });
      if (res.ok) {
        reset(); setOpen(false); router.refresh();
      } else {
        setErr(res.error);
      }
    });
  }

  function remove(id: string) {
    start(async () => {
      await deleteWorkoutAction(id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="self-start rounded-full px-4 py-2 text-[13px] font-medium text-white" style={{ background: "var(--accent)", cursor: "pointer" }}>
          + Log a workout
        </button>
      ) : (
        <div className="rounded-[16px] border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-[12px]" style={{ color: "var(--muted)" }}>Workout name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Push day"
                className="pz-in rounded-lg border px-2.5 py-2 text-[14px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px]" style={{ color: "var(--muted)" }}>Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="pz-in rounded-lg border px-2.5 py-2 text-[14px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} />
            </label>
          </div>

          <div className="mt-3 text-[12px]" style={{ color: "var(--muted)" }}>Exercises</div>
          <div className="mt-1.5 flex flex-col gap-2">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <input value={r.exercise} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, exercise: e.target.value } : x)))} placeholder="Exercise"
                  className="pz-in col-span-5 rounded-lg border px-2.5 py-2 text-[13.5px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} />
                <input value={r.sets} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, sets: e.target.value } : x)))} placeholder="Sets" inputMode="numeric"
                  className="pz-in col-span-2 rounded-lg border px-2 py-2 text-[13.5px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} />
                <input value={r.reps} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, reps: e.target.value } : x)))} placeholder="Reps" inputMode="numeric"
                  className="pz-in col-span-2 rounded-lg border px-2 py-2 text-[13.5px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} />
                <input value={r.weight} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, weight: e.target.value } : x)))} placeholder={weightUnit} inputMode="decimal"
                  className="pz-in col-span-3 rounded-lg border px-2 py-2 text-[13.5px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setRows((rs) => [...rs, emptyRow()])} className="mt-2 text-[12.5px] font-medium" style={{ color: "var(--accent)", cursor: "pointer" }}>+ Add exercise</button>

          <label className="mt-3 flex max-w-[160px] flex-col gap-1">
            <span className="text-[12px]" style={{ color: "var(--muted)" }}>Duration (min)</span>
            <input value={duration} onChange={(e) => setDuration(e.target.value)} inputMode="numeric" placeholder="—"
              className="pz-in rounded-lg border px-2.5 py-2 text-[14px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} />
          </label>

          {err && <div className="mt-2 text-[12.5px]" style={{ color: "#d4544f" }}>{err}</div>}
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={pending} onClick={save} className="rounded-full px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60" style={{ background: "var(--accent)", cursor: "pointer" }}>
              {pending ? "Saving…" : "Save workout"}
            </button>
            <button type="button" onClick={() => { reset(); setOpen(false); }} className="rounded-full border px-4 py-2 text-[13px]" style={{ borderColor: "var(--border)", color: "var(--muted)", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {workouts.length === 0 ? (
        <div className="rounded-[16px] border p-8 text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="text-[14px] font-medium">No workouts yet</div>
          <p className="mt-1 text-[13px]" style={{ color: "var(--muted)" }}>Log your first session, or just tell the AI bar “did push day”.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {workouts.map((w) => (
            <div key={w.id} className="rounded-[16px] border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[15px] font-semibold">{w.name}</div>
                  <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>{prettyDate(w.date)}{w.durationMin ? ` · ${w.durationMin} min` : ""}</div>
                </div>
                <button type="button" onClick={() => remove(w.id)} aria-label="Delete workout" className="text-[12px]" style={{ color: "var(--muted)", cursor: "pointer" }}>Delete</button>
              </div>
              {w.sets.length > 0 && (
                <div className="mt-2.5 flex flex-col gap-1">
                  {w.sets.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-[13px]">
                      <span>{s.exercise}</span>
                      <span style={{ color: "var(--muted)" }}>
                        {[s.sets != null ? `${s.sets}×` : "", s.reps != null ? `${s.reps}` : "", s.weight != null ? ` @ ${fmt(s.weight, weightUnit)}` : ""].join("").trim() || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {w.notes && <p className="mt-2 text-[12.5px]" style={{ color: "var(--muted)" }}>{w.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- AI coach ---------------- */

function Coach() {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function ask() {
    setLoading(true); setErr(null);
    try {
      const res = await fetch("/api/gym/coach", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) setSuggestion(d.suggestion);
      else setErr(d.error || "Couldn't get a suggestion — try again.");
    } catch {
      setErr("Couldn't reach the coach — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[16px] border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="text-[15px] font-semibold">AI coach</div>
      <p className="mt-1 text-[13px]" style={{ color: "var(--muted)" }}>Get a workout suggestion based on what you’ve been training and your body trend.</p>
      <button type="button" disabled={loading} onClick={ask} className="mt-3 rounded-full px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60" style={{ background: "var(--accent)", cursor: "pointer" }}>
        {loading ? "Thinking…" : suggestion ? "Suggest another" : "Suggest my next workout"}
      </button>
      {err && <div className="mt-3 text-[12.5px]" style={{ color: "#d4544f" }}>{err}</div>}
      {suggestion && (
        <div className="mt-4 rounded-[12px] p-4 text-[13.5px] leading-relaxed" style={{ background: "var(--surface2)", whiteSpace: "pre-wrap" }}>
          {suggestion}
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  addCategoryAction,
  addSavingsGoalAction,
  addSubscriptionAction,
  addTransactionAction,
  deleteCategoryAction,
  deleteSavingsGoalAction,
  deleteSubscriptionAction,
  deleteTransactionAction,
  updateSavingsGoalAction,
} from "@/lib/actions/finance";
import {
  formatMoney,
  monthlyCost,
  type Cadence,
  type ClientSavingsGoal,
  type ClientSubscription,
  type ClientTransaction,
} from "@/lib/finance/types";

type Section = "overview" | "transactions" | "subscriptions" | "savings";
const SECTIONS: { key: Section; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "transactions", label: "Transactions" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "savings", label: "Savings" },
];

function prettyDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export default function FinanceTab({
  transactions,
  categories,
  subscriptions,
  savings,
  today,
}: {
  transactions: ClientTransaction[];
  categories: { id: string; name: string }[];
  subscriptions: ClientSubscription[];
  savings: ClientSavingsGoal[];
  today: string;
}) {
  const [section, setSection] = useState<Section>("overview");

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-[28px] font-medium tracking-tight">Finance</h1>

      <div className="mt-4 flex gap-1.5 overflow-x-auto">
        {SECTIONS.map((s) => {
          const on = s.key === section;
          return (
            <button key={s.key} type="button" onClick={() => setSection(s.key)}
              className="flex-none rounded-full px-3.5 py-1.5 text-[13px] font-medium"
              style={{ background: on ? "var(--accent)" : "var(--surface2)", color: on ? "#fff" : "var(--text)", cursor: "pointer" }}>
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {section === "overview" && <Overview transactions={transactions} subscriptions={subscriptions} savings={savings} today={today} />}
        {section === "transactions" && <Transactions transactions={transactions} categories={categories} today={today} />}
        {section === "subscriptions" && <Subscriptions subscriptions={subscriptions} today={today} />}
        {section === "savings" && <Savings savings={savings} />}
      </div>
    </div>
  );
}

/* ---------------- Overview ---------------- */

function cutoffDate(today: string, daysBack: number): string {
  const [y, m, d] = today.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - daysBack);
  return dt.toISOString().slice(0, 10);
}

function Overview({
  transactions,
  subscriptions,
  savings,
  today,
}: {
  transactions: ClientTransaction[];
  subscriptions: ClientSubscription[];
  savings: ClientSavingsGoal[];
  today: string;
}) {
  const { income, expense, byCat } = useMemo(() => {
    const since = cutoffDate(today, 60);
    let income = 0, expense = 0;
    const byCat: Record<string, number> = {};
    for (const t of transactions) {
      if (t.date < since) continue;
      if (t.type === "income") income += t.amount;
      else { expense += t.amount; const c = t.category || "uncategorized"; byCat[c] = (byCat[c] ?? 0) + t.amount; }
    }
    return { income, expense, byCat };
  }, [transactions, today]);

  const catData = Object.entries(byCat).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value).slice(0, 8);
  const subsMonthly = subscriptions.reduce((s, x) => s + monthlyCost(x.amount, x.cadence), 0);
  const net = income - expense;

  const palette = ["var(--accent)", "#e0a53d", "#e86a8e", "#2fa8a0", "#719a5f", "#7c8cff", "#f0916b", "#8a8f98"];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Income" value={formatMoney(income)} tone="up" />
        <Stat label="Expenses" value={formatMoney(expense)} tone="down" />
        <Stat label="Net" value={formatMoney(net)} tone={net >= 0 ? "up" : "down"} />
        <Stat label="Subscriptions" value={`${formatMoney(subsMonthly)}/mo`} />
      </div>

      <div className="rounded-[16px] border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="text-[13.5px] font-semibold">Spending by category</div>
        <p className="text-[12px]" style={{ color: "var(--muted)" }}>Last 60 days</p>
        {catData.length === 0 ? (
          <div className="mt-3 flex flex-col items-center justify-center gap-1 rounded-[12px] py-8 text-center" style={{ background: "var(--surface2)" }}>
            <span className="text-[13px]" style={{ color: "var(--muted)" }}>No expenses logged yet</span>
            <span className="text-[12px]" style={{ color: "var(--muted)", opacity: 0.8 }}>Add a transaction to see where it goes.</span>
          </div>
        ) : (
          <div className="mt-2" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catData} margin={{ top: 8, right: 6, bottom: 0, left: -10 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} interval={0} angle={-12} textAnchor="end" height={48} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={44} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} formatter={(v) => [formatMoney(Number(v)), "Spent"] as [string, string]} cursor={{ fill: "color-mix(in srgb, var(--accent) 8%, transparent)" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {catData.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {savings.length > 0 && (
        <div className="rounded-[16px] border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="text-[13.5px] font-semibold">Savings</div>
          <div className="mt-2 flex flex-col gap-3">
            {savings.map((g) => <SavingsBar key={g.id} goal={g} />)}
          </div>
        </div>
      )}

      <InsightCard />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  const color = tone === "up" ? "var(--success, #3fb984)" : tone === "down" ? "#d4544f" : "var(--text)";
  return (
    <div className="rounded-[16px] border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>{label}</div>
      <div className="mt-1 text-[20px] font-semibold tracking-tight" style={{ color }}>{value}</div>
    </div>
  );
}

function SavingsBar({ goal }: { goal: ClientSavingsGoal }) {
  const pct = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="font-medium">{goal.name}</span>
        <span style={{ color: "var(--muted)" }}>{formatMoney(goal.currentAmount)} / {formatMoney(goal.targetAmount)}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full" style={{ background: "var(--surface2)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--accent)" }} />
      </div>
    </div>
  );
}

function InsightCard() {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function ask() {
    setLoading(true); setErr(null);
    try {
      const res = await fetch("/api/finance/insight", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) setInsight(d.insight);
      else setErr(d.error || "Couldn't get an insight — try again.");
    } catch {
      setErr("Couldn't reach the server — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[16px] border p-4" style={{ background: "var(--surface)", borderColor: "color-mix(in srgb, var(--accent) 30%, var(--border))" }}>
      <div className="flex items-center justify-between">
        <div className="text-[13.5px] font-semibold">AI insight</div>
        <button type="button" disabled={loading} onClick={ask} className="rounded-full px-3 py-1.5 text-[12.5px] font-medium text-white disabled:opacity-60" style={{ background: "var(--accent)", cursor: "pointer" }}>
          {loading ? "Thinking…" : insight ? "Refresh" : "Get insight"}
        </button>
      </div>
      {err && <div className="mt-2 text-[12.5px]" style={{ color: "#d4544f" }}>{err}</div>}
      {insight ? (
        <p className="mt-2 text-[13.5px] leading-relaxed">{insight}</p>
      ) : (
        <p className="mt-2 text-[12.5px]" style={{ color: "var(--muted)" }}>Get a grounded read on your income, spending and subscriptions.</p>
      )}
    </div>
  );
}

/* ---------------- Transactions ---------------- */

function Transactions({
  transactions,
  categories,
  today,
}: {
  transactions: ClientTransaction[];
  categories: { id: string; name: string }[];
  today: string;
}) {
  const router = useRouter();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [newCat, setNewCat] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setErr(null);
    start(async () => {
      const res = await addTransactionAction({ date, amount, type, category, note });
      if (res.ok) { setAmount(""); setNote(""); router.refresh(); }
      else setErr(res.error ?? "Couldn't save.");
    });
  }
  function remove(id: string) { start(async () => { await deleteTransactionAction(id); router.refresh(); }); }
  function addCat() { const n = newCat.trim(); if (!n) return; start(async () => { await addCategoryAction(n); setNewCat(""); router.refresh(); }); }
  function removeCat(id: string) { start(async () => { await deleteCategoryAction(id); router.refresh(); }); }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[16px] border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex gap-1.5">
          {(["expense", "income"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} className="rounded-full px-3 py-1 text-[12.5px] font-medium capitalize"
              style={{ background: type === t ? "var(--accent)" : "var(--surface2)", color: type === t ? "#fff" : "var(--text)", cursor: "pointer" }}>{t}</button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-[12px]" style={{ color: "var(--muted)" }}>Amount</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0"
              className="pz-in rounded-lg border px-2.5 py-2 text-[14px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px]" style={{ color: "var(--muted)" }}>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="pz-in rounded-lg border px-2.5 py-2 text-[14px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px]" style={{ color: "var(--muted)" }}>Category</span>
            <input value={category} onChange={(e) => setCategory(e.target.value)} list="finance-cats" placeholder="e.g. groceries"
              className="pz-in rounded-lg border px-2.5 py-2 text-[14px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} />
            <datalist id="finance-cats">{categories.map((c) => <option key={c.id} value={c.name} />)}</datalist>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px]" style={{ color: "var(--muted)" }}>Note</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional"
              className="pz-in rounded-lg border px-2.5 py-2 text-[14px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} />
          </label>
        </div>
        {err && <div className="mt-2 text-[12.5px]" style={{ color: "#d4544f" }}>{err}</div>}
        <button type="button" disabled={pending} onClick={save} className="mt-3 rounded-full px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60" style={{ background: "var(--accent)", cursor: "pointer" }}>
          {pending ? "Saving…" : "Add transaction"}
        </button>
      </div>

      <div className="rounded-[16px] border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="text-[13px] font-semibold">Categories</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {categories.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px]" style={{ background: "var(--surface2)" }}>
              {c.name}
              <button type="button" onClick={() => removeCat(c.id)} aria-label={`Remove ${c.name}`} style={{ color: "var(--muted)", cursor: "pointer" }}>×</button>
            </span>
          ))}
          <span className="inline-flex items-center gap-1">
            <input value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCat()} placeholder="add category"
              className="pz-in w-28 rounded-full border px-2.5 py-1 text-[12.5px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} />
          </span>
        </div>
      </div>

      {transactions.length === 0 ? (
        <Empty title="No transactions yet" sub="Add income or an expense above to get started." />
      ) : (
        <div className="flex flex-col gap-1.5">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-[12px] border px-3.5 py-2.5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-medium">{t.category || (t.type === "income" ? "Income" : "Expense")}{t.note ? <span className="font-normal" style={{ color: "var(--muted)" }}> · {t.note}</span> : ""}</div>
                <div className="text-[12px]" style={{ color: "var(--muted)" }}>{prettyDate(t.date)}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-semibold" style={{ color: t.type === "income" ? "var(--success, #3fb984)" : "var(--text)" }}>
                  {t.type === "income" ? "+" : "−"}{formatMoney(t.amount)}
                </span>
                <button type="button" onClick={() => remove(t.id)} aria-label="Delete" style={{ color: "var(--muted)", cursor: "pointer" }}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Subscriptions ---------------- */

const CADENCES: Cadence[] = ["weekly", "monthly", "quarterly", "yearly"];

function Subscriptions({ subscriptions, today }: { subscriptions: ClientSubscription[]; today: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [next, setNext] = useState(today);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const monthly = subscriptions.reduce((s, x) => s + monthlyCost(x.amount, x.cadence), 0);

  function save() {
    setErr(null);
    start(async () => {
      const res = await addSubscriptionAction({ name, amount, cadence, nextChargeDate: next });
      if (res.ok) { setName(""); setAmount(""); router.refresh(); }
      else setErr(res.error ?? "Couldn't save.");
    });
  }
  function remove(id: string) { start(async () => { await deleteSubscriptionAction(id); router.refresh(); }); }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[16px] border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="flex flex-col gap-1"><span className="text-[12px]" style={{ color: "var(--muted)" }}>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spotify" className="pz-in rounded-lg border px-2.5 py-2 text-[14px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} /></label>
          <label className="flex flex-col gap-1"><span className="text-[12px]" style={{ color: "var(--muted)" }}>Amount</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0" className="pz-in rounded-lg border px-2.5 py-2 text-[14px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} /></label>
          <label className="flex flex-col gap-1"><span className="text-[12px]" style={{ color: "var(--muted)" }}>Cadence</span>
            <select value={cadence} onChange={(e) => setCadence(e.target.value as Cadence)} className="pz-in rounded-lg border px-2.5 py-2 text-[14px] outline-none capitalize" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}>
              {CADENCES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select></label>
          <label className="flex flex-col gap-1"><span className="text-[12px]" style={{ color: "var(--muted)" }}>Next charge</span>
            <input type="date" value={next} onChange={(e) => setNext(e.target.value)} className="pz-in rounded-lg border px-2.5 py-2 text-[14px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} /></label>
        </div>
        {err && <div className="mt-2 text-[12.5px]" style={{ color: "#d4544f" }}>{err}</div>}
        <button type="button" disabled={pending} onClick={save} className="mt-3 rounded-full px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60" style={{ background: "var(--accent)", cursor: "pointer" }}>{pending ? "Saving…" : "Add subscription"}</button>
      </div>

      {subscriptions.length === 0 ? (
        <Empty title="No subscriptions tracked" sub="Add your recurring costs to see the monthly total." />
      ) : (
        <>
          <div className="text-[13px]" style={{ color: "var(--muted)" }}>About <span className="font-semibold" style={{ color: "var(--text)" }}>{formatMoney(monthly)}/month</span> across {subscriptions.length} {subscriptions.length === 1 ? "subscription" : "subscriptions"}.</div>
          <div className="flex flex-col gap-1.5">
            {subscriptions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-[12px] border px-3.5 py-2.5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div>
                  <div className="text-[13.5px] font-medium">{s.name}</div>
                  <div className="text-[12px]" style={{ color: "var(--muted)" }}>{s.cadence}{s.nextChargeDate ? ` · next ${prettyDate(s.nextChargeDate)}` : ""}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[14px] font-semibold">{formatMoney(s.amount)}</span>
                  <button type="button" onClick={() => remove(s.id)} aria-label="Delete" style={{ color: "var(--muted)", cursor: "pointer" }}>×</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Savings ---------------- */

function Savings({ savings }: { savings: ClientSavingsGoal[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setErr(null);
    start(async () => {
      const res = await addSavingsGoalAction({ name, targetAmount: target, currentAmount: current });
      if (res.ok) { setName(""); setTarget(""); setCurrent(""); router.refresh(); }
      else setErr(res.error ?? "Couldn't save.");
    });
  }
  function addTo(g: ClientSavingsGoal, delta: number) {
    start(async () => { await updateSavingsGoalAction(g.id, { currentAmount: Math.max(0, g.currentAmount + delta) }); router.refresh(); });
  }
  function remove(id: string) { start(async () => { await deleteSavingsGoalAction(id); router.refresh(); }); }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[16px] border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1"><span className="text-[12px]" style={{ color: "var(--muted)" }}>Goal name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency fund" className="pz-in rounded-lg border px-2.5 py-2 text-[14px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} /></label>
          <label className="flex flex-col gap-1"><span className="text-[12px]" style={{ color: "var(--muted)" }}>Target</span>
            <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" placeholder="0" className="pz-in rounded-lg border px-2.5 py-2 text-[14px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} /></label>
          <label className="flex flex-col gap-1"><span className="text-[12px]" style={{ color: "var(--muted)" }}>Saved so far</span>
            <input value={current} onChange={(e) => setCurrent(e.target.value)} inputMode="decimal" placeholder="0" className="pz-in rounded-lg border px-2.5 py-2 text-[14px] outline-none" style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }} /></label>
        </div>
        {err && <div className="mt-2 text-[12.5px]" style={{ color: "#d4544f" }}>{err}</div>}
        <button type="button" disabled={pending} onClick={save} className="mt-3 rounded-full px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60" style={{ background: "var(--accent)", cursor: "pointer" }}>{pending ? "Saving…" : "Add savings goal"}</button>
      </div>

      {savings.length === 0 ? (
        <Empty title="No savings goals yet" sub="Set a goal and watch the progress fill up." />
      ) : (
        <div className="flex flex-col gap-3">
          {savings.map((g) => (
            <div key={g.id} className="rounded-[16px] border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between">
                <SavingsBar goal={g} />
                <button type="button" onClick={() => remove(g.id)} aria-label="Delete" className="ml-3 flex-none text-[12px]" style={{ color: "var(--muted)", cursor: "pointer" }}>Delete</button>
              </div>
              <div className="mt-3 flex gap-2">
                {[10, 50, 100].map((d) => (
                  <button key={d} type="button" onClick={() => addTo(g, d)} className="rounded-full border px-2.5 py-1 text-[12px]" style={{ borderColor: "var(--border)", cursor: "pointer" }}>+{d}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="rounded-[16px] border p-8 text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="text-[14px] font-medium">{title}</div>
      <p className="mt-1 text-[13px]" style={{ color: "var(--muted)" }}>{sub}</p>
    </div>
  );
}

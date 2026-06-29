import { NextResponse } from "next/server";
import {
  getMyTimezone,
  getTransactionsSince,
  listFinanceSubscriptions,
  listSavingsGoals,
  requireUserId,
  UnauthenticatedError,
} from "@/lib/db/scoped";
import { todayInTimeZone } from "@/lib/widgets/date";
import { addDays } from "@/lib/widgets/streak";
import { callDeepSeek, hasDeepSeekKey, type ChatMsg } from "@/lib/assistant/deepseek";
import { allowRequest } from "@/lib/assistant/ratelimit";
import { monthlyCost, type Cadence } from "@/lib/finance/types";

export const runtime = "nodejs";

const SYSTEM = `You are a calm, practical personal-finance companion inside a dashboard.
You are given JSON with the user's last ~60 days of income/expense totals, spending by category, recurring subscriptions, and savings goals.
Write ONE short, grounded insight (max ~70 words):
- Use only the numbers given; never invent figures.
- Point out the most useful thing: a category that's large, subscriptions adding up, savings progress, or income vs expense balance.
- Be encouraging and concrete, suggest one small next step.
- Sentence case. No markdown headers, no bullet lists, no emoji.`;

function localInsight(income: number, expense: number, topCat: string | null, subsMonthly: number): string {
  if (income === 0 && expense === 0) return "No transactions yet — add a few and I'll spot where your money is going and how your savings are tracking.";
  const net = income - expense;
  const parts: string[] = [];
  parts.push(net >= 0 ? `You're net positive by about ${Math.round(net)} over this period.` : `You spent about ${Math.round(-net)} more than you earned this period.`);
  if (topCat) parts.push(`${topCat} is your biggest spending category.`);
  if (subsMonthly > 0) parts.push(`Recurring subscriptions run roughly ${Math.round(subsMonthly)}/month — worth a quick review.`);
  return parts.join(" ");
}

export async function POST() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (e) {
    if (e instanceof UnauthenticatedError) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    throw e;
  }
  if (!allowRequest(userId)) {
    return NextResponse.json({ ok: false, error: "Give me a moment — too many requests." }, { status: 429 });
  }

  const tz = await getMyTimezone();
  const since = addDays(todayInTimeZone(tz), -60);
  const [txns, subs, goals] = await Promise.all([
    getTransactionsSince(since),
    listFinanceSubscriptions(),
    listSavingsGoals(),
  ]);

  let income = 0;
  let expense = 0;
  const byCat: Record<string, number> = {};
  for (const t of txns) {
    const amt = Number(t.amount);
    if (t.type === "income") income += amt;
    else {
      expense += amt;
      const c = t.category || "uncategorized";
      byCat[c] = (byCat[c] ?? 0) + amt;
    }
  }
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const subsMonthly = subs.reduce((s, x) => s + monthlyCost(Number(x.amount), x.cadence as Cadence), 0);

  const context = {
    periodDays: 60,
    income: Math.round(income),
    expense: Math.round(expense),
    net: Math.round(income - expense),
    spendingByCategory: Object.fromEntries(Object.entries(byCat).map(([k, v]) => [k, Math.round(v)])),
    subscriptionsMonthly: Math.round(subsMonthly),
    savingsGoals: goals.map((g) => ({ name: g.name, target: Number(g.targetAmount), current: Number(g.currentAmount) })),
  };

  if (!hasDeepSeekKey()) {
    return NextResponse.json({ ok: true, insight: localInsight(income, expense, topCat, subsMonthly), model: false });
  }

  const messages: ChatMsg[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: JSON.stringify(context) },
  ];
  try {
    const insight = await callDeepSeek(messages, 200, { timeoutMs: 18_000 });
    return NextResponse.json({ ok: true, insight, model: true });
  } catch {
    return NextResponse.json({ ok: true, insight: localInsight(income, expense, topCat, subsMonthly), model: false });
  }
}

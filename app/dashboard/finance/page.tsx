import { redirect } from "next/navigation";
import { auth } from "@/auth";
import FinanceTab from "@/components/FinanceTab";
import {
  getMyProfile,
  getTransactionsSince,
  listFinanceCategories,
  listFinanceSubscriptions,
  listSavingsGoals,
} from "@/lib/db/scoped";
import { todayInTimeZone } from "@/lib/widgets/date";
import { addDays } from "@/lib/widgets/streak";
import type { Cadence, ClientSavingsGoal, ClientSubscription, ClientTransaction } from "@/lib/finance/types";

export default async function FinancePage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const profile = await getMyProfile();
  const tz = profile?.timezone || "UTC";
  const today = todayInTimeZone(tz);
  const since = addDays(today, -180);

  const [txnRows, catRows, subRows, goalRows] = await Promise.all([
    getTransactionsSince(since),
    listFinanceCategories(),
    listFinanceSubscriptions(),
    listSavingsGoals(),
  ]);

  const transactions: ClientTransaction[] = txnRows.map((t) => ({
    id: t.id,
    date: t.date,
    amount: Number(t.amount),
    type: t.type,
    category: t.category,
    note: t.note,
  }));
  const categories = catRows.map((c) => ({ id: c.id, name: c.name }));
  const subscriptions: ClientSubscription[] = subRows.map((s) => ({
    id: s.id,
    name: s.name,
    amount: Number(s.amount),
    cadence: s.cadence as Cadence,
    nextChargeDate: s.nextChargeDate,
  }));
  const savings: ClientSavingsGoal[] = goalRows.map((g) => ({
    id: g.id,
    name: g.name,
    targetAmount: Number(g.targetAmount),
    currentAmount: Number(g.currentAmount),
  }));

  return <FinanceTab transactions={transactions} categories={categories} subscriptions={subscriptions} savings={savings} today={today} />;
}

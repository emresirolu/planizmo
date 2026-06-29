"use server";

import { revalidatePath } from "next/cache";
import {
  addFinanceCategory,
  addFinanceSubscription,
  addSavingsGoal,
  addTransaction,
  deleteFinanceCategory,
  deleteFinanceSubscription,
  deleteSavingsGoal,
  deleteTransaction,
  getMyTimezone,
  updateSavingsGoal,
} from "@/lib/db/scoped";
import { todayInTimeZone } from "@/lib/widgets/date";
import type { Cadence } from "@/lib/finance/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CADENCES: Cadence[] = ["weekly", "monthly", "quarterly", "yearly"];

async function resolveDate(input?: string | null): Promise<string> {
  if (input && DATE_RE.test(input)) return input;
  return todayInTimeZone(await getMyTimezone());
}

function pos(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function addTransactionAction(input: {
  date?: string;
  amount: number | string;
  type: "income" | "expense";
  category?: string | null;
  note?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const amount = pos(input.amount);
  if (amount == null || amount === 0) return { ok: false, error: "Enter an amount." };
  if (input.type !== "income" && input.type !== "expense") return { ok: false, error: "Pick income or expense." };
  try {
    await addTransaction({
      date: await resolveDate(input.date),
      amount,
      type: input.type,
      category: input.category?.trim() || null,
      note: input.note?.trim() || null,
    });
    revalidatePath("/dashboard/finance");
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't save — try again." };
  }
}

export async function deleteTransactionAction(id: string): Promise<{ ok: boolean }> {
  const ok = await deleteTransaction(id);
  if (ok) revalidatePath("/dashboard/finance");
  return { ok };
}

export async function addCategoryAction(name: string): Promise<{ ok: boolean; error?: string }> {
  const n = name.trim();
  if (!n) return { ok: false, error: "Enter a name." };
  await addFinanceCategory(n.slice(0, 40));
  revalidatePath("/dashboard/finance");
  return { ok: true };
}

export async function deleteCategoryAction(id: string): Promise<{ ok: boolean }> {
  const ok = await deleteFinanceCategory(id);
  if (ok) revalidatePath("/dashboard/finance");
  return { ok };
}

export async function addSubscriptionAction(input: {
  name: string;
  amount: number | string;
  cadence: Cadence;
  nextChargeDate?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const name = input.name.trim();
  const amount = pos(input.amount);
  if (!name) return { ok: false, error: "Enter a name." };
  if (amount == null || amount === 0) return { ok: false, error: "Enter an amount." };
  const cadence = CADENCES.includes(input.cadence) ? input.cadence : "monthly";
  const next = input.nextChargeDate && DATE_RE.test(input.nextChargeDate) ? input.nextChargeDate : null;
  await addFinanceSubscription({ name: name.slice(0, 50), amount, cadence, nextChargeDate: next });
  revalidatePath("/dashboard/finance");
  return { ok: true };
}

export async function deleteSubscriptionAction(id: string): Promise<{ ok: boolean }> {
  const ok = await deleteFinanceSubscription(id);
  if (ok) revalidatePath("/dashboard/finance");
  return { ok };
}

export async function addSavingsGoalAction(input: {
  name: string;
  targetAmount: number | string;
  currentAmount?: number | string;
}): Promise<{ ok: boolean; error?: string }> {
  const name = input.name.trim();
  const target = pos(input.targetAmount);
  const current = pos(input.currentAmount ?? 0) ?? 0;
  if (!name) return { ok: false, error: "Name your goal." };
  if (target == null || target === 0) return { ok: false, error: "Set a target amount." };
  await addSavingsGoal({ name: name.slice(0, 50), targetAmount: target, currentAmount: current });
  revalidatePath("/dashboard/finance");
  return { ok: true };
}

export async function updateSavingsGoalAction(
  id: string,
  patch: { name?: string; targetAmount?: number | string; currentAmount?: number | string },
): Promise<{ ok: boolean }> {
  const clean: { name?: string; targetAmount?: number; currentAmount?: number } = {};
  if (patch.name !== undefined) clean.name = patch.name.trim().slice(0, 50);
  if (patch.targetAmount !== undefined) { const v = pos(patch.targetAmount); if (v != null) clean.targetAmount = v; }
  if (patch.currentAmount !== undefined) { const v = pos(patch.currentAmount); if (v != null) clean.currentAmount = v; }
  const row = await updateSavingsGoal(id, clean);
  if (row) revalidatePath("/dashboard/finance");
  return { ok: Boolean(row) };
}

export async function deleteSavingsGoalAction(id: string): Promise<{ ok: boolean }> {
  const ok = await deleteSavingsGoal(id);
  if (ok) revalidatePath("/dashboard/finance");
  return { ok };
}

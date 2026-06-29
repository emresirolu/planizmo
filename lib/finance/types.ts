export type Cadence = "weekly" | "monthly" | "quarterly" | "yearly";

export type ClientTransaction = {
  id: string;
  date: string;
  amount: number;
  type: "income" | "expense";
  category: string | null;
  note: string | null;
};

export type ClientSubscription = {
  id: string;
  name: string;
  amount: number;
  cadence: Cadence;
  nextChargeDate: string | null;
};

export type ClientSavingsGoal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
};

/** Normalize any cadence to an approximate monthly cost (for totals). */
export function monthlyCost(amount: number, cadence: Cadence): number {
  switch (cadence) {
    case "weekly": return amount * 52 / 12;
    case "quarterly": return amount / 3;
    case "yearly": return amount / 12;
    default: return amount;
  }
}

export function formatMoney(n: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n);
  } catch {
    return `$${Math.round(n)}`;
  }
}

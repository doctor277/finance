import { addMonths, format } from "date-fns";
import Papa from "papaparse";

import { fromDateKey } from "@/lib/dates";
import { milliunitsToDecimal } from "@/lib/utils";

/** "yyyy-MM" for every month touched by the range, in order. */
export function monthsInRange(startKey: string, endKey: string): string[] {
  const months: string[] = [];
  let cursor = fromDateKey(`${startKey.slice(0, 7)}-01`);
  const last = endKey.slice(0, 7);
  while (format(cursor, "yyyy-MM") <= last) {
    months.push(format(cursor, "yyyy-MM"));
    cursor = addMonths(cursor, 1);
  }
  return months;
}

type MonthTotals = { month: string; income: number; expenses: number };

/** One entry per month of the range (zeros for quiet months), with net = income - expenses. */
export function fillMonths(rows: MonthTotals[], startKey: string, endKey: string) {
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  return monthsInRange(startKey, endKey).map((month) => {
    const row = byMonth.get(month);
    const income = row?.income ?? 0;
    const expenses = row?.expenses ?? 0;
    return { month, income, expenses, net: income - expenses };
  });
}

type Slice = { name: string; spent: number };

/**
 * Adds each item's share of the total (0..1, summing to 1 when the total is
 * non-zero) and folds everything after `keep` items into one "Other" slice.
 */
export function withShares<T extends Slice>(items: T[], keep = Infinity) {
  const total = items.reduce((sum, item) => sum + item.spent, 0);
  const head: Slice[] = items.slice(0, keep);
  const rest = items.slice(keep);
  if (rest.length > 0) {
    head.push({ name: `Other (${rest.length})`, spent: rest.reduce((s, i) => s + i.spent, 0) });
  }
  return head.map((item) => ({ ...item, share: total === 0 ? 0 : item.spent / total }));
}

export type ExportRow = {
  date: string;
  account: string;
  category: string | null;
  payee: string;
  amount: number;
  notes: string | null;
};

/** Transactions as CSV with exact decimal amounts and formula-escaped text. */
export function buildTransactionsCsv(rows: ExportRow[]): string {
  return Papa.unparse(
    {
      fields: ["Date", "Account", "Category", "Payee", "Amount", "Notes"],
      data: rows.map((r) => [
        r.date,
        r.account,
        r.category ?? "Uncategorized",
        r.payee,
        milliunitsToDecimal(r.amount),
        r.notes ?? "",
      ]),
    },
    { escapeFormulae: /^([=@\t\r]|[+-][^\d.,\s])/ },
  );
}

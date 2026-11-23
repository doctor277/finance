import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { accounts, categories, transactions } from "@/db/schema";
import type { DateRange } from "@/server/lib/date-range";

/**
 * Aggregations for the dashboard and the reports page. Every query joins
 * through accounts and filters on accounts.user_id, so a user only ever sees
 * their own money. All amounts are integer milliunits; `expenses` and `spent`
 * are positive magnitudes (spending $50 is expenses: 50000).
 */
export type Scope = { userId: string; range: DateRange; accountId?: string };

const where = ({ userId, range, accountId }: Scope) =>
  and(
    eq(accounts.userId, userId),
    accountId ? eq(transactions.accountId, accountId) : undefined,
    gte(transactions.date, range.start),
    lte(transactions.date, range.end),
  );

// SUM() of an integer column is a bigint, which the driver returns as a string.
const income = sql<number>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.amount} else 0 end), 0)`.mapWith(Number);
const expenses = sql<number>`coalesce(sum(case when ${transactions.amount} < 0 then -${transactions.amount} else 0 end), 0)`.mapWith(Number);

export async function getTotals(scope: Scope) {
  const [row] = await db
    .select({
      income,
      expenses,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(where(scope));

  return { income: row.income, expenses: row.expenses, net: row.income - row.expenses, count: row.count };
}

/** Spending per category, largest first. Uncategorized spending is its own row. */
export async function getSpendingByCategory(scope: Scope) {
  const spent = sql<number>`sum(-${transactions.amount})`.mapWith(Number);
  return db
    .select({
      categoryId: transactions.categoryId,
      name: sql<string>`coalesce(${categories.name}, 'Uncategorized')`,
      spent,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(where(scope), sql`${transactions.amount} < 0`))
    .groupBy(transactions.categoryId, categories.name)
    .orderBy(desc(spent), categories.name);
}

export async function getDailyTotals(scope: Scope) {
  return db
    .select({ date: transactions.date, income, expenses })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(where(scope))
    .groupBy(transactions.date)
    .orderBy(transactions.date);
}

export async function getMonthlyTotals(scope: Scope) {
  const month = sql<string>`to_char(${transactions.date}, 'YYYY-MM')`;
  return db
    .select({ month, income, expenses })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(where(scope))
    .groupBy(month)
    .orderBy(month);
}

/**
 * Payees ranked by money spent. Payees are grouped case-insensitively with
 * surrounding spaces ignored, and shown with their most recent spelling.
 */
export async function getTopPayees(scope: Scope, limit = 10) {
  const key = sql`lower(trim(${transactions.payee}))`;
  const spent = sql<number>`coalesce(sum(case when ${transactions.amount} < 0 then -${transactions.amount} else 0 end), 0)`.mapWith(Number);
  return db
    .select({
      payee: sql<string>`(array_agg(${transactions.payee} order by ${transactions.date} desc))[1]`,
      count: sql<number>`count(*)`.mapWith(Number),
      spent,
      received: income,
      lastDate: sql<string>`max(${transactions.date})::text`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(where(scope))
    .groupBy(key)
    .orderBy(desc(spent), desc(sql`count(*)`), key)
    .limit(limit);
}

/** Every transaction in scope, for CSV export. */
export async function getTransactionsForExport(scope: Scope) {
  return db
    .select({
      date: transactions.date,
      account: accounts.name,
      category: categories.name,
      payee: transactions.payee,
      amount: transactions.amount,
      notes: transactions.notes,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(where(scope))
    .orderBy(transactions.date, transactions.id);
}

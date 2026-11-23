import { Hono } from "hono";
import { and, sql, sum, eq, gte, lte, lt, desc } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";

import { db } from "@/db/drizzle";
import { accounts, categories, transactions } from "@/db/schema";
import { calculatePercentageChange, fillMissingDays } from "@/lib/utils";
import { dateRangeQuerySchema } from "@/lib/schemas";
import { requireAuth, type AuthEnv } from "@/server/lib/auth";
import { previousPeriod, resolveDateRange } from "@/server/lib/date-range";

const app = new Hono<AuthEnv>().use(requireAuth).get(
  "/",
  zValidator("query", dateRangeQuerySchema),
  async (c) => {
    const auth = { userId: c.get("userId") };
    const { from, to, accountId } = c.req.valid("query");

    const range = resolveDateRange(from, to);
    const lastRange = previousPeriod(range);
    const startDate = range.start;
    const endDate = range.end;

    async function fetchFinancialData(
      userId: string,
      startDate: string,
      endDate: string,
    ) {
      return await db
        .select({
          income:
            sql`SUM(CASE WHEN ${transactions.amount} >= 0 THEN ${transactions.amount} ELSE 0 END)`.mapWith(
              Number,
            ),
          expenses:
            sql`SUM(CASE WHEN ${transactions.amount} < 0 THEN ${transactions.amount} ELSE 0 END)`.mapWith(
              Number,
            ),
          remaining: sum(transactions.amount).mapWith(Number),
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(
          and(
            accountId ? eq(transactions.accountId, accountId) : undefined,
            eq(accounts.userId, userId),
            gte(transactions.date, startDate),
            lte(transactions.date, endDate),
          ),
        );
    }

    const [currentPeriod] = await fetchFinancialData(
      auth.userId,
      startDate,
      endDate,
    );
    const [lastPeriod] = await fetchFinancialData(
      auth.userId,
      lastRange.start,
      lastRange.end,
    );

    const incomeChange = calculatePercentageChange(
      currentPeriod.income,
      lastPeriod.income,
    );
    const expensesChange = calculatePercentageChange(
      currentPeriod.expenses,
      lastPeriod.expenses,
    );
    const remainingChange = calculatePercentageChange(
      currentPeriod.remaining,
      lastPeriod.remaining,
    );

    const category = await db
      .select({
        name: categories.name,
        value: sql`SUM(ABS(${transactions.amount}))`.mapWith(Number),
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          accountId ? eq(transactions.accountId, accountId) : undefined,
          eq(accounts.userId, auth.userId),
          lt(transactions.amount, 0),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
        ),
      )
      .groupBy(categories.name)
      .orderBy(desc(sql`SUM(ABS(${transactions.amount}))`));

    const topCategories = category.slice(0, 3);
    const otherCategories = category.slice(3);
    const otherSum = otherCategories.reduce(
      (sum, current) => sum + current.value,
      0,
    );

    const finalCategories = topCategories;
    if (otherCategories.length > 0) {
      finalCategories.push({
        name: "Other",
        value: otherSum,
      });
    }

    const activeDays = await db
      .select({
        date: transactions.date,
        income:
          sql`SUM(CASE WHEN ${transactions.amount} >= 0 THEN ${transactions.amount} ELSE 0 END)`.mapWith(
            Number,
          ),
        expenses:
          sql`SUM(CASE WHEN ${transactions.amount} < 0 THEN ABS(${transactions.amount}) ELSE 0 END)`.mapWith(
            Number,
          ),
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          accountId ? eq(transactions.accountId, accountId) : undefined,
          eq(accounts.userId, auth.userId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
        ),
      )
      .groupBy(transactions.date)
      .orderBy(transactions.date);

    const days = fillMissingDays(activeDays, startDate, endDate);

    return c.json({
      data: {
        remainingAmount: currentPeriod.remaining,
        remainingChange,
        incomeAmount: currentPeriod.income,
        incomeChange,
        expensesAmount: currentPeriod.expenses,
        expensesChange,
        categories: finalCategories,
        days,
      },
    });
  },
);

export default app;

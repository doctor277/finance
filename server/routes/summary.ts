import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { dateRangeQuerySchema } from "@/lib/schemas";
import { calculatePercentageChange, fillMissingDays } from "@/lib/utils";
import { withShares } from "@/lib/reports";
import { requireAuth, type AuthEnv } from "@/server/lib/auth";
import { previousPeriod, resolveDateRange } from "@/server/lib/date-range";
import { getDailyTotals, getSpendingByCategory, getTotals, hasAnyTransactions } from "@/server/lib/report-queries";

/** Dashboard overview: totals vs the previous period, top categories, daily series. */
const app = new Hono<AuthEnv>().use(requireAuth).get("/", zValidator("query", dateRangeQuerySchema), async (c) => {
  const { from, to, accountId } = c.req.valid("query");
  const userId = c.get("userId");
  const range = resolveDateRange(from, to);
  const scope = { userId, range, accountId: accountId || undefined };

  const [current, previous, categories, days, hasTransactions] = await Promise.all([
    getTotals(scope),
    getTotals({ ...scope, range: previousPeriod(range) }),
    getSpendingByCategory(scope),
    getDailyTotals(scope),
    hasAnyTransactions(userId),
  ]);

  return c.json({
    data: {
      range,
      /** False for a brand-new user: the dashboard shows "import your first CSV". */
      hasTransactions,
      incomeAmount: current.income,
      // Spending as a positive number, so "spending went up" is a positive change.
      expensesAmount: current.expenses,
      remainingAmount: current.net,
      incomeChange: calculatePercentageChange(current.income, previous.income),
      expensesChange: calculatePercentageChange(current.expenses, previous.expenses),
      remainingChange: calculatePercentageChange(current.net, previous.net),
      categories: withShares(categories, 3).map(({ name, spent }) => ({ name, value: spent })),
      days: fillMissingDays(days, range.start, range.end),
    },
  });
});

export default app;

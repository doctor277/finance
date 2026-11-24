import { Hono } from "hono";
import { validate } from "@/server/lib/validate";

import { dateRangeQuerySchema } from "@/lib/schemas";
import { buildTransactionsCsv, fillMonths, withShares } from "@/lib/reports";
import { requireAuth, type AuthEnv } from "@/server/lib/auth";
import { resolveDateRange } from "@/server/lib/date-range";
import { ownsAllAccounts } from "@/server/lib/ownership";
import {
  getMonthlyTotals,
  getSpendingByCategory,
  getTopPayees,
  getTotals,
  getTransactionsForExport,
} from "@/server/lib/report-queries";

const app = new Hono<AuthEnv>()
  .use(requireAuth)
  .get("/", validate("query", dateRangeQuerySchema), async (c) => {
    const { from, to, accountId } = c.req.valid("query");
    const range = resolveDateRange(from, to);
    const scope = { userId: c.get("userId"), range, accountId: accountId || undefined };

    const [totals, months, categories, payees] = await Promise.all([
      getTotals(scope),
      getMonthlyTotals(scope),
      getSpendingByCategory(scope),
      getTopPayees(scope, 10),
    ]);

    return c.json({
      data: {
        range,
        totals,
        months: fillMonths(months, range.start, range.end),
        categories: withShares(categories),
        payees,
      },
    });
  })
  .get("/export", validate("query", dateRangeQuerySchema), async (c) => {
    const { from, to, accountId } = c.req.valid("query");
    const userId = c.get("userId");
    if (accountId && !(await ownsAllAccounts(userId, [accountId]))) {
      return c.json({ error: "Account not found" }, 404);
    }

    const range = resolveDateRange(from, to);
    const rows = await getTransactionsForExport({ userId, range, accountId: accountId || undefined });

    c.header("Content-Type", "text/csv; charset=utf-8");
    c.header("Content-Disposition", `attachment; filename="transactions-${range.start}-to-${range.end}.csv"`);
    // BOM so Excel reads UTF-8 (accents, €) correctly.
    return c.body(`﻿${buildTransactionsCsv(rows)}`);
  });

export default app;

import { Hono } from "hono";
import { validate } from "@/server/lib/validate";
import { createId } from "@paralleldrive/cuid2";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { accounts, categories, transactions } from "@/db/schema";
import {
  bulkTransactionInputSchema,
  dateRangeQuerySchema,
  duplicateCheckSchema,
  idParamSchema,
  idsSchema,
  transactionInputSchema,
} from "@/lib/schemas";
import { requireAuth, type AuthEnv } from "@/server/lib/auth";
import { ownsAllAccounts, ownsAllCategories } from "@/server/lib/ownership";
import { resolveDateRange } from "@/server/lib/date-range";
import { matchExisting } from "@/lib/import/duplicates";

/** Ids of the given transactions that belong to `userId` (through their account). */
async function ownedTransactionIds(userId: string, ids: string[]) {
  const rows = await db
    .select({ id: transactions.id })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(inArray(transactions.id, ids), eq(accounts.userId, userId)));

  return rows.map((row) => row.id);
}

const app = new Hono<AuthEnv>()
  .use(requireAuth)
  .get("/", validate("query", dateRangeQuerySchema), async (c) => {
    const { from, to, accountId } = c.req.valid("query");

    const range = resolveDateRange(from, to);

    const data = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        category: categories.name,
        categoryId: transactions.categoryId,
        payee: transactions.payee,
        amount: transactions.amount,
        notes: transactions.notes,
        account: accounts.name,
        accountId: transactions.accountId,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          accountId ? eq(transactions.accountId, accountId) : undefined,
          eq(accounts.userId, c.get("userId")),
          gte(transactions.date, range.start),
          lte(transactions.date, range.end),
        ),
      )
      .orderBy(desc(transactions.date), desc(transactions.id));

    return c.json({ data });
  })
  .get("/:id", validate("param", idParamSchema), async (c) => {
    const { id } = c.req.valid("param");

    const [data] = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        categoryId: transactions.categoryId,
        payee: transactions.payee,
        amount: transactions.amount,
        notes: transactions.notes,
        accountId: transactions.accountId,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(and(eq(transactions.id, id), eq(accounts.userId, c.get("userId"))));

    if (!data) return c.json({ error: "Not found" }, 404);

    return c.json({ data });
  })
  .post("/", validate("json", transactionInputSchema), async (c) => {
    const userId = c.get("userId");
    const values = c.req.valid("json");

    if (!(await ownsAllAccounts(userId, [values.accountId]))) {
      return c.json({ error: "Account not found" }, 404);
    }
    if (!(await ownsAllCategories(userId, [values.categoryId]))) {
      return c.json({ error: "Category not found" }, 404);
    }

    const [data] = await db
      .insert(transactions)
      .values({ id: createId(), ...values })
      .returning();

    return c.json({ data }, 201);
  })
  .post("/bulk-create", validate("json", bulkTransactionInputSchema), async (c) => {
    const userId = c.get("userId");
    const values = c.req.valid("json");

    if (!(await ownsAllAccounts(userId, values.map((v) => v.accountId)))) {
      return c.json({ error: "Account not found" }, 404);
    }
    if (!(await ownsAllCategories(userId, values.map((v) => v.categoryId)))) {
      return c.json({ error: "Category not found" }, 404);
    }

    const data = await db
      .insert(transactions)
      .values(values.map((value) => ({ id: createId(), ...value })))
      .returning({ id: transactions.id });

    return c.json({ data }, 201);
  })
  // Used by the CSV import preview: which incoming rows already exist in the account?
  .post("/duplicates", validate("json", duplicateCheckSchema), async (c) => {
    const { accountId, rows } = c.req.valid("json");

    if (!(await ownsAllAccounts(c.get("userId"), [accountId]))) {
      return c.json({ error: "Account not found" }, 404);
    }

    const dates = rows.map((r) => r.date).sort();
    const existing = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        amount: transactions.amount,
        payee: transactions.payee,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          gte(transactions.date, dates[0]),
          lte(transactions.date, dates[dates.length - 1]),
        ),
      )
      .orderBy(transactions.date, transactions.id);

    return c.json({ data: { duplicateOf: matchExisting(rows, existing) } });
  })
  .post("/bulk-delete", validate("json", idsSchema), async (c) => {
    const { ids } = c.req.valid("json");

    const owned = await ownedTransactionIds(c.get("userId"), ids);
    if (owned.length === 0) return c.json({ data: [] });

    const data = await db
      .delete(transactions)
      .where(inArray(transactions.id, owned))
      .returning({ id: transactions.id });

    return c.json({ data });
  })
  .patch(
    "/:id",
    validate("param", idParamSchema),
    validate("json", transactionInputSchema),
    async (c) => {
      const userId = c.get("userId");
      const { id } = c.req.valid("param");
      const values = c.req.valid("json");

      const [owned] = await ownedTransactionIds(userId, [id]);
      if (!owned) return c.json({ error: "Not found" }, 404);

      // The transaction is ours, but the target account/category must be ours too,
      // otherwise a PATCH could move it into someone else's account.
      if (!(await ownsAllAccounts(userId, [values.accountId]))) {
        return c.json({ error: "Account not found" }, 404);
      }
      if (!(await ownsAllCategories(userId, [values.categoryId]))) {
        return c.json({ error: "Category not found" }, 404);
      }

      const [data] = await db
        .update(transactions)
        .set({ ...values, categoryId: values.categoryId ?? null, notes: values.notes ?? null })
        .where(eq(transactions.id, owned))
        .returning();

      return c.json({ data });
    },
  )
  .delete("/:id", validate("param", idParamSchema), async (c) => {
    const [owned] = await ownedTransactionIds(c.get("userId"), [c.req.valid("param").id]);
    if (!owned) return c.json({ error: "Not found" }, 404);

    const [data] = await db
      .delete(transactions)
      .where(eq(transactions.id, owned))
      .returning({ id: transactions.id });

    return c.json({ data });
  });

export default app;

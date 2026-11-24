import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { accounts, categories, transactions } from "@/db/schema";
import { createTestApp } from "../helpers/test-app";

const ALICE = "user_alice";
const BOB = "user_bob";

let t: Awaited<ReturnType<typeof createTestApp>>;

beforeAll(async () => {
  t = await createTestApp();
}, 60_000);

beforeEach(async () => {
  await t.reset();
  await t.db.insert(accounts).values([
    { id: "acc_alice", name: "Alice checking", userId: ALICE },
    { id: "acc_bob", name: "Bob checking", userId: BOB },
  ]);
  await t.db.insert(categories).values([
    { id: "cat_alice", name: "Alice food", userId: ALICE },
    { id: "cat_bob", name: "Bob food", userId: BOB },
  ]);
  await t.db.insert(transactions).values([
    {
      id: "tx_alice",
      accountId: "acc_alice",
      categoryId: "cat_alice",
      payee: "Alice grocer",
      amount: -12_340,
      date: "2026-01-15",
    },
    {
      id: "tx_bob",
      accountId: "acc_bob",
      categoryId: "cat_bob",
      payee: "Bob grocer",
      amount: -5_000,
      date: "2026-01-15",
    },
  ]);
});

const newTx = (overrides: Record<string, unknown> = {}) => ({
  date: "2026-01-20",
  accountId: "acc_bob",
  categoryId: null,
  payee: "Coffee",
  amount: -4_500,
  notes: null,
  ...overrides,
});

const countIn = async (accountId: string) =>
  (await t.db.select().from(transactions).where(eq(transactions.accountId, accountId)))
    .length;

describe("signed-out requests", () => {
  test.each([
    ["GET", "/api/accounts"],
    ["GET", "/api/categories"],
    ["GET", "/api/transactions"],
    ["GET", "/api/summary"],
    ["POST", "/api/transactions"],
  ])("%s %s returns 401", async (method, path) => {
    const res = await t.request(method, path, { body: method === "POST" ? newTx() : undefined });
    expect(res.status).toBe(401);
  });
});

describe("transactions: a user cannot write into another user's account", () => {
  test("create into own account succeeds", async () => {
    const res = await t.request("POST", "/api/transactions", { as: BOB, body: newTx() });
    expect(res.status).toBe(201);
    expect(await countIn("acc_bob")).toBe(2);
  });

  test("create into someone else's account is rejected and writes nothing", async () => {
    const res = await t.request("POST", "/api/transactions", {
      as: BOB,
      body: newTx({ accountId: "acc_alice" }),
    });
    expect(res.status).toBe(404);
    expect(await countIn("acc_alice")).toBe(1);
  });

  test("create with someone else's category is rejected", async () => {
    const res = await t.request("POST", "/api/transactions", {
      as: BOB,
      body: newTx({ categoryId: "cat_alice" }),
    });
    expect(res.status).toBe(404);
    expect(await countIn("acc_bob")).toBe(1);
  });

  test("bulk-create with one foreign row is rejected as a whole", async () => {
    const res = await t.request("POST", "/api/transactions/bulk-create", {
      as: BOB,
      body: [newTx(), newTx({ accountId: "acc_alice" }), newTx()],
    });
    expect(res.status).toBe(404);
    expect(await countIn("acc_bob")).toBe(1);
    expect(await countIn("acc_alice")).toBe(1);
  });

  test("bulk-create with a foreign category is rejected", async () => {
    const res = await t.request("POST", "/api/transactions/bulk-create", {
      as: BOB,
      body: [newTx({ categoryId: "cat_alice" })],
    });
    expect(res.status).toBe(404);
    expect(await countIn("acc_bob")).toBe(1);
  });

  test("PATCH cannot move your own transaction into someone else's account", async () => {
    const res = await t.request("PATCH", "/api/transactions/tx_bob", {
      as: BOB,
      body: newTx({ accountId: "acc_alice" }),
    });
    expect(res.status).toBe(404);
    const [row] = await t.db.select().from(transactions).where(eq(transactions.id, "tx_bob"));
    expect(row.accountId).toBe("acc_bob");
  });

  test("PATCH cannot attach someone else's category", async () => {
    const res = await t.request("PATCH", "/api/transactions/tx_bob", {
      as: BOB,
      body: newTx({ categoryId: "cat_alice" }),
    });
    expect(res.status).toBe(404);
  });

  test("PATCH on someone else's transaction is 404 and changes nothing", async () => {
    const res = await t.request("PATCH", "/api/transactions/tx_alice", {
      as: BOB,
      body: newTx(),
    });
    expect(res.status).toBe(404);
    const [row] = await t.db.select().from(transactions).where(eq(transactions.id, "tx_alice"));
    expect(row.payee).toBe("Alice grocer");
    expect(row.accountId).toBe("acc_alice");
  });

  test("PATCH own transaction within own account succeeds", async () => {
    const res = await t.request("PATCH", "/api/transactions/tx_bob", {
      as: BOB,
      body: newTx({ payee: "Renamed", categoryId: "cat_bob" }),
    });
    expect(res.status).toBe(200);
  });
});

describe("transactions: a user cannot read or delete another user's data", () => {
  test("GET by id is 404", async () => {
    const res = await t.request("GET", "/api/transactions/tx_alice", { as: BOB });
    expect(res.status).toBe(404);
  });

  test("list only returns own rows, even when filtering by a foreign account", async () => {
    const own = await t.request("GET", "/api/transactions?from=2026-01-01&to=2026-01-31", { as: BOB });
    const ownBody = (await own.json()) as { data: { id: string }[] };
    expect(ownBody.data.map((r) => r.id)).toEqual(["tx_bob"]);

    const foreign = await t.request(
      "GET",
      "/api/transactions?from=2026-01-01&to=2026-01-31&accountId=acc_alice",
      { as: BOB },
    );
    expect(((await foreign.json()) as { data: unknown[] }).data).toEqual([]);
  });

  test("DELETE by id is 404 and the row survives", async () => {
    const res = await t.request("DELETE", "/api/transactions/tx_alice", { as: BOB });
    expect(res.status).toBe(404);
    expect(await countIn("acc_alice")).toBe(1);
  });

  test("bulk-delete silently skips foreign ids", async () => {
    const res = await t.request("POST", "/api/transactions/bulk-delete", {
      as: BOB,
      body: { ids: ["tx_alice", "tx_bob"] },
    });
    const body = (await res.json()) as { data: { id: string }[] };
    expect(body.data.map((r) => r.id)).toEqual(["tx_bob"]);
    expect(await countIn("acc_alice")).toBe(1);
  });
});

describe("duplicate check for CSV import", () => {
  test("flags rows already in the account, one-to-one", async () => {
    const res = await t.request("POST", "/api/transactions/duplicates", {
      as: BOB,
      body: {
        accountId: "acc_bob",
        rows: [
          { date: "2026-01-15", amount: -5_000, payee: "BOB GROCER" },
          { date: "2026-01-15", amount: -5_000, payee: "bob grocer" },
          { date: "2026-01-16", amount: -5_000, payee: "Bob grocer" },
        ],
      },
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { data: { duplicateOf: unknown[] } }).data.duplicateOf).toEqual([
      "tx_bob",
      null,
      null,
    ]);
  });

  test("cannot be used to probe another user's account", async () => {
    const res = await t.request("POST", "/api/transactions/duplicates", {
      as: BOB,
      body: { accountId: "acc_alice", rows: [{ date: "2026-01-15", amount: -12_340, payee: "Alice grocer" }] },
    });
    expect(res.status).toBe(404);
  });
});

describe("accounts and categories are scoped to their owner", () => {
  test.each(["accounts", "categories"])("cannot rename another user's %s", async (resource) => {
    const id = resource === "accounts" ? "acc_alice" : "cat_alice";
    const res = await t.request("PATCH", `/api/${resource}/${id}`, {
      as: BOB,
      body: { name: "pwned" },
    });
    expect(res.status).toBe(404);
  });

  test.each(["accounts", "categories"])("cannot delete another user's %s", async (resource) => {
    const id = resource === "accounts" ? "acc_alice" : "cat_alice";
    const del = await t.request("DELETE", `/api/${resource}/${id}`, { as: BOB });
    expect(del.status).toBe(404);
    const bulk = await t.request("POST", `/api/${resource}/bulk-delete`, {
      as: BOB,
      body: { ids: [id] },
    });
    expect(((await bulk.json()) as { data: unknown[] }).data).toEqual([]);
  });

  test("list returns only own accounts", async () => {
    const res = await t.request("GET", "/api/accounts", { as: ALICE });
    const body = (await res.json()) as { data: { id: string }[] };
    expect(body.data.map((a) => a.id)).toEqual(["acc_alice"]);
  });
});

describe("input validation", () => {
  test("rejects a non-integer milliunit amount", async () => {
    const res = await t.request("POST", "/api/transactions", {
      as: BOB,
      body: newTx({ amount: 12.5 }),
    });
    expect(res.status).toBe(400);
  });

  test("rejects an empty payee", async () => {
    const res = await t.request("POST", "/api/transactions", {
      as: BOB,
      body: newTx({ payee: "   " }),
    });
    expect(res.status).toBe(400);
  });

  test.each([2_147_483_648, -2_147_483_648])("rejects amount %d outside the database range", async (amount) => {
    const res = await t.request("POST", "/api/transactions", { as: BOB, body: newTx({ amount }) });
    expect(res.status).toBe(400);
  });

  test("rejects an impossible date", async () => {
    const res = await t.request("POST", "/api/transactions", {
      as: BOB,
      body: newTx({ date: "2026-02-30" }),
    });
    expect(res.status).toBe(400);
  });

  test("rejects a malformed date filter", async () => {
    const res = await t.request("GET", "/api/transactions?from=01/02/2026", { as: BOB });
    expect(res.status).toBe(400);
  });

  test("stores and returns the calendar date unchanged", async () => {
    const created = await t.request("POST", "/api/transactions", {
      as: BOB,
      body: newTx({ date: "2026-03-08" }),
    });
    const { data } = (await created.json()) as { data: { id: string } };
    const res = await t.request("GET", `/api/transactions/${data.id}`, { as: BOB });
    expect(((await res.json()) as { data: { date: string } }).data.date).toBe("2026-03-08");
  });

  test("validation errors use the same { error } shape as other API errors", async () => {
    const res = await t.request("POST", "/api/transactions", {
      as: BOB,
      body: newTx({ payee: "   " }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: { path: string; message: string }[] };
    expect(body.error).toBe("payee: Payee is required");
    expect(body.issues[0]).toEqual({ path: "payee", message: "Payee is required" });
  });

  test("rejects an empty account name", async () => {
    const res = await t.request("POST", "/api/accounts", { as: BOB, body: { name: "" } });
    expect(res.status).toBe(400);
  });
});

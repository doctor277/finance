import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import Papa from "papaparse";

import { accounts, categories, transactions } from "@/db/schema";
import { createTestApp } from "../helpers/test-app";

const ALICE = "user_alice";
const BOB = "user_bob";

let t: Awaited<ReturnType<typeof createTestApp>>;

beforeAll(async () => {
  t = await createTestApp();
}, 60_000);

/**
 * Alice, Jan-Mar 2026 (amounts in milliunits):
 *   Jan: salary +3000.00, rent -1500.00 (Housing), groceries -120.50 (Food), coffee -4.75 (no category)
 *   Feb: salary +3000.00, rent -1500.00, groceries -80.25 + "  GROCER  " -19.75 (same payee, other spelling)
 *   Mar: refund +20.00 from Grocer, savings account transfer +500.00
 * Bob has one big expense in the same months that must never appear in Alice's numbers.
 */
beforeEach(async () => {
  await t.reset();
  await t.db.insert(accounts).values([
    { id: "a_chq", name: "Chequing", userId: ALICE },
    { id: "a_sav", name: "Savings", userId: ALICE },
    { id: "b_chq", name: "Bob chequing", userId: BOB },
  ]);
  await t.db.insert(categories).values([
    { id: "c_housing", name: "Housing", userId: ALICE },
    { id: "c_food", name: "Food", userId: ALICE },
  ]);
  const tx = (id: string, date: string, payee: string, amount: number, categoryId: string | null = null, accountId = "a_chq") =>
    ({ id, date, payee, amount, categoryId, accountId, notes: null });
  await t.db.insert(transactions).values([
    tx("t1", "2026-01-01", "Northwind Payroll", 3_000_000),
    tx("t2", "2026-01-02", "Maple Rent", -1_500_000, "c_housing"),
    tx("t3", "2026-01-10", "Grocer", -120_500, "c_food"),
    tx("t4", "2026-01-11", "Corner Cafe", -4_750),
    tx("t5", "2026-02-01", "Northwind Payroll", 3_000_000),
    tx("t6", "2026-02-02", "Maple Rent", -1_500_000, "c_housing"),
    tx("t7", "2026-02-10", "Grocer", -80_250, "c_food"),
    tx("t8", "2026-02-20", "  GROCER  ", -19_750, "c_food"),
    tx("t9", "2026-03-05", "Grocer", 20_000, "c_food"),
    tx("t10", "2026-03-06", "Transfer in", 500_000, null, "a_sav"),
    tx("b1", "2026-02-15", "Bob yacht", -99_000_000, null, "b_chq"),
  ]);
});

type Report = {
  range: { start: string; end: string };
  totals: { income: number; expenses: number; net: number; count: number };
  months: { month: string; income: number; expenses: number; net: number }[];
  categories: { categoryId: string | null; name: string; spent: number; count: number; share: number }[];
  payees: { payee: string; count: number; spent: number; received: number; lastDate: string }[];
};

const report = async (query: string, as = ALICE) => {
  const res = await t.request("GET", `/api/reports?${query}`, { as });
  expect(res.status).toBe(200);
  return ((await res.json()) as { data: Report }).data;
};

describe("GET /api/reports", () => {
  test("totals add up to the cent", async () => {
    const r = await report("from=2026-01-01&to=2026-03-31");
    expect(r.totals).toEqual({
      income: 6_520_000, // 3000 + 3000 + 20 + 500
      expenses: 3_225_250, // 1500 + 120.50 + 4.75 + 1500 + 80.25 + 19.75
      net: 3_294_750,
      count: 10,
    });
  });

  test("months cover the whole range, including empty ones", async () => {
    const r = await report("from=2025-12-15&to=2026-04-02");
    expect(r.months).toEqual([
      { month: "2025-12", income: 0, expenses: 0, net: 0 },
      { month: "2026-01", income: 3_000_000, expenses: 1_625_250, net: 1_374_750 },
      { month: "2026-02", income: 3_000_000, expenses: 1_600_000, net: 1_400_000 },
      { month: "2026-03", income: 520_000, expenses: 0, net: 520_000 },
      { month: "2026-04", income: 0, expenses: 0, net: 0 },
    ]);
  });

  test("spending by category includes Uncategorized and shares sum to 1", async () => {
    const r = await report("from=2026-01-01&to=2026-03-31");
    expect(r.categories.map(({ name, spent, count }) => ({ name, spent, count }))).toEqual([
      { name: "Housing", spent: 3_000_000, count: 2 },
      { name: "Food", spent: 220_500, count: 3 },
      { name: "Uncategorized", spent: 4_750, count: 1 },
    ]);
    const total = r.categories.reduce((s, c) => s + c.share, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  test("income never counts as category spending (the Grocer refund)", async () => {
    const r = await report("from=2026-03-01&to=2026-03-31");
    expect(r.categories).toEqual([]);
  });

  test("top payees group spellings and rank by money spent", async () => {
    const r = await report("from=2026-01-01&to=2026-03-31");
    expect(r.payees[0]).toMatchObject({ payee: "Maple Rent", count: 2, spent: 3_000_000 });
    expect(r.payees[1]).toEqual({
      payee: "Grocer", // most recent spelling (Mar 5)
      count: 4,
      spent: 220_500,
      received: 20_000,
      lastDate: "2026-03-05",
    });
  });

  test("the date range is inclusive on both ends", async () => {
    const r = await report("from=2026-01-02&to=2026-01-10");
    expect(r.totals.count).toBe(2); // t2 on the 2nd and t3 on the 10th
  });

  test("account filter narrows every section", async () => {
    const r = await report("from=2026-01-01&to=2026-03-31&accountId=a_sav");
    expect(r.totals).toEqual({ income: 500_000, expenses: 0, net: 500_000, count: 1 });
    expect(r.payees.map((p) => p.payee)).toEqual(["Transfer in"]);
  });

  test("another user's data never leaks in, even with their account id", async () => {
    const mine = await report("from=2026-01-01&to=2026-03-31");
    expect(mine.payees.map((p) => p.payee)).not.toContain("Bob yacht");
    const probe = await report("from=2026-01-01&to=2026-03-31&accountId=b_chq");
    expect(probe.totals.count).toBe(0);
  });

  test("requires sign-in", async () => {
    expect((await t.request("GET", "/api/reports")).status).toBe(401);
  });
});

describe("GET /api/reports/export", () => {
  test("returns the filtered transactions as CSV with exact amounts", async () => {
    const res = await t.request("GET", "/api/reports/export?from=2026-01-01&to=2026-01-31", { as: ALICE });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain('filename="transactions-2026-01-01-to-2026-01-31.csv"');

    const text = (await res.text()).replace(/^﻿/, "");
    const rows = Papa.parse<string[]>(text.trim()).data;
    expect(rows).toEqual([
      ["Date", "Account", "Category", "Payee", "Amount", "Notes"],
      ["2026-01-01", "Chequing", "Uncategorized", "Northwind Payroll", "3000.00", ""],
      ["2026-01-02", "Chequing", "Housing", "Maple Rent", "-1500.00", ""],
      ["2026-01-10", "Chequing", "Food", "Grocer", "-120.50", ""],
      ["2026-01-11", "Chequing", "Uncategorized", "Corner Cafe", "-4.75", ""],
    ]);
  });

  test("refuses another user's account", async () => {
    const res = await t.request("GET", "/api/reports/export?accountId=b_chq", { as: ALICE });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/summary", () => {
  test("expenses are positive and a rise in spending is a positive change", async () => {
    const res = await t.request("GET", "/api/summary?from=2026-02-01&to=2026-02-28", { as: ALICE });
    const { data } = (await res.json()) as {
      data: { expensesAmount: number; incomeAmount: number; remainingAmount: number; expensesChange: number | null; categories: { name: string; value: number }[] };
    };
    expect(data.expensesAmount).toBe(1_600_000);
    expect(data.incomeAmount).toBe(3_000_000);
    expect(data.remainingAmount).toBe(1_400_000);
    // Previous 28 days (Jan 4-31) had 120.50 + 4.75 = 125.25 of spending.
    expect(data.expensesChange).toBeCloseTo(((1_600_000 - 125_250) / 125_250) * 100, 6);
    expect(data.categories).toEqual([
      { name: "Housing", value: 1_500_000 },
      { name: "Food", value: 100_000 },
    ]);
  });

  test("no baseline gives a null change instead of +100%", async () => {
    const res = await t.request("GET", "/api/summary?from=2026-01-01&to=2026-01-31", { as: ALICE });
    const { data } = (await res.json()) as { data: { incomeChange: number | null } };
    expect(data.incomeChange).toBeNull();
  });
});

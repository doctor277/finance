import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import { buildTransactionsCsv, fillMonths, monthsInRange, withShares } from "@/lib/reports";
import { parseAmount } from "@/lib/import/amounts";
import {
  calculatePercentageChange,
  formatCurrency,
  fromMilliunits,
  milliunitsToDecimal,
  toMilliunits,
} from "@/lib/utils";

describe("milliunit conversions", () => {
  test.each([
    [12.34, 12_340],
    [-12.34, -12_340],
    [0.1 + 0.2, 300], // float noise is rounded away
    [1.005, 1_005],
    [4.35, 4_350],
    [-0.0004, 0],
  ])("toMilliunits(%d) = %d", (dollars, milli) => {
    expect(toMilliunits(dollars)).toBe(milli);
  });

  test("never produces -0", () => {
    expect(Object.is(toMilliunits(-0.0001), 0)).toBe(true);
  });

  test("fromMilliunits", () => {
    expect(fromMilliunits(12_340)).toBe(12.34);
    expect(fromMilliunits(-5)).toBe(-0.005);
  });

  test.each([
    [12_340, "12.34"],
    [-12_340, "-12.34"],
    [0, "0.00"],
    [5, "0.005"],
    [-1_850_000, "-1850.00"],
    [2_147_483_647, "2147483.647"],
    [100, "0.10"],
  ])("milliunitsToDecimal(%d) = %s", (milli, text) => {
    expect(milliunitsToDecimal(milli)).toBe(text);
  });

  test("property: exported decimal text parses back to the same milliunits", () => {
    fc.assert(
      fc.property(fc.integer({ min: -2_147_483_647, max: 2_147_483_647 }), (m) => {
        const parsed = parseAmount(milliunitsToDecimal(m));
        expect(parsed.ok && parsed.milliunits).toBe(m);
      }),
      { numRuns: 2000 },
    );
  });

  test("property: dollars -> milliunits -> dollars is stable for cent amounts", () => {
    fc.assert(
      fc.property(fc.integer({ min: -100_000_000, max: 100_000_000 }), (cents) => {
        const milli = toMilliunits(cents / 100);
        expect(milli).toBe(cents * 10);
        expect(toMilliunits(fromMilliunits(milli))).toBe(milli);
      }),
    );
  });

  test("currency is formatted as CAD", () => {
    expect(formatCurrency(-1234.5)).toBe("-$1,234.50");
  });
});

describe("calculatePercentageChange", () => {
  test("normal change", () => expect(calculatePercentageChange(150, 100)).toBe(50));
  test("drop", () => expect(calculatePercentageChange(50, 100)).toBe(-50));
  test("from a negative baseline", () => expect(calculatePercentageChange(-50, -100)).toBe(50));
  test("no baseline is null, not +100%", () => expect(calculatePercentageChange(10, 0)).toBeNull());
  test("nothing to nothing is 0", () => expect(calculatePercentageChange(0, 0)).toBe(0));
});

describe("report helpers", () => {
  test("monthsInRange crosses a year boundary", () => {
    expect(monthsInRange("2025-11-20", "2026-02-03")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(monthsInRange("2026-03-01", "2026-03-31")).toEqual(["2026-03"]);
  });

  test("fillMonths fills gaps and computes net", () => {
    expect(fillMonths([{ month: "2026-02", income: 10, expenses: 4 }], "2026-01-05", "2026-02-10")).toEqual([
      { month: "2026-01", income: 0, expenses: 0, net: 0 },
      { month: "2026-02", income: 10, expenses: 4, net: 6 },
    ]);
  });

  test("withShares folds the tail into Other and shares sum to 1", () => {
    const slices = withShares(
      [
        { name: "A", spent: 50 },
        { name: "B", spent: 30 },
        { name: "C", spent: 15 },
        { name: "D", spent: 5 },
      ],
      2,
    );
    expect(slices).toEqual([
      { name: "A", spent: 50, share: 0.5 },
      { name: "B", spent: 30, share: 0.3 },
      { name: "Other (2)", spent: 20, share: 0.2 },
    ]);
  });

  test("withShares on nothing", () => expect(withShares([])).toEqual([]));

  test("export CSV escapes formulas but not negative amounts", () => {
    const csv = buildTransactionsCsv([
      { date: "2026-01-01", account: "Chq", category: null, payee: "=cmd()", amount: -12_500, notes: "@x" },
    ]);
    expect(csv.split("\r\n")[1]).toBe("2026-01-01,Chq,Uncategorized,'=cmd(),-12.50,'@x");
  });
});

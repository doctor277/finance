import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import {
  MAX_MILLIUNITS,
  combineDebitCredit,
  detectDecimalSeparator,
  parseAmount,
} from "@/lib/import/amounts";

const ok = (raw: string, decimal: "." | "," = ".") => {
  const result = parseAmount(raw, decimal);
  if (!result.ok) throw new Error(`expected ${raw} to parse: ${result.error}`);
  return result.milliunits;
};
const err = (raw: string, decimal: "." | "," = ".") => {
  const result = parseAmount(raw, decimal);
  if (result.ok) throw new Error(`expected ${raw} to fail, got ${result.milliunits}`);
  return result.error;
};

describe("parseAmount: formats seen in bank exports", () => {
  test.each([
    ["12.34", 12_340],
    ["-12.34", -12_340],
    ["+12.34", 12_340],
    ["12", 12_000],
    [".5", 500],
    ["0.10", 100],
    ["$1,234.56", 1_234_560],
    ["-$1,234.56", -1_234_560],
    ["$-4.75", -4_750],
    ["CAD 99.99", 99_990],
    ["99.99 USD", 99_990],
    ["(64.99)", -64_990],
    ["($64.99)", -64_990],
    ["12.50-", -12_500],
    ["−12.50", -12_500],
    ["45.00 CR", 45_000],
    ["82.17 DR", -82_170],
    ["  1 234.50 ", 1_234_500],
    ["1 234.50", 1_234_500],
    ["1'234.50", 1_234_500],
    ["1,234,567.89", 1_234_567_890],
    ["0.00", 0],
    ["-0.00", 0],
  ])("%s -> %d milliunits", (raw, expected) => {
    expect(ok(raw)).toBe(expected);
  });

  test.each([
    ["-54,20", -54_200],
    ["2.412,50", 2_412_500],
    ["1.150,00", 1_150_000],
    ["€ 12,5", 12_500],
  ])("decimal comma: %s -> %d", (raw, expected) => {
    expect(ok(raw, ",")).toBe(expected);
  });

  test("rounds beyond 3 decimals half away from zero, with a warning", () => {
    const result = parseAmount("-212.3456");
    expect(result).toEqual({
      ok: true,
      milliunits: -212_346,
      warnings: ["Rounded -212.3456 to 3 decimal places"],
    });
    expect(ok("0.0004")).toBe(0);
    expect(ok("0.0005")).toBe(1);
  });
});

describe("parseAmount: rejections explain why", () => {
  test("empty", () => expect(err("   ")).toBe("Amount is empty"));
  test("text", () => expect(err("N/A")).toBe('"N/A" is not a valid amount'));
  test("only a currency sign", () => expect(err("$")).toBe('"$" has no number in it'));
  test("badly grouped thousands", () => expect(err("1,23,4")).toContain("not a valid amount"));
  test("two decimal points", () => expect(err("1.2.3")).toContain("not a valid amount"));
  test("decimal comma in a dot file gets a hint", () => {
    expect(err("12,50")).toContain("switch the decimal separator");
  });
  test("negative and CR at once", () => expect(err("-5.00 CR")).toContain("both negative and CR"));
  test("over the database limit", () => {
    expect(err("2147483.648")).toContain("too large");
    expect(ok("2147483.647")).toBe(MAX_MILLIUNITS);
    expect(err("99999999999999")).toContain("too large");
  });
});

describe("parseAmount: properties", () => {
  const milliunits = fc.integer({ min: -MAX_MILLIUNITS, max: MAX_MILLIUNITS });

  /** Renders milliunits the way different banks print them. */
  const render = (m: number, style: number): { text: string; decimal: "." | "," } => {
    const neg = m < 0;
    const abs = Math.abs(m);
    const int = Math.floor(abs / 1000);
    const frac = String(abs % 1000).padStart(3, "0");
    const grouped = (sep: string) => String(int).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    switch (style) {
      case 0: return { text: `${neg ? "-" : ""}${int}.${frac}`, decimal: "." };
      case 1: return { text: `${neg ? "-" : ""}$${grouped(",")}.${frac}`, decimal: "." };
      case 2: return { text: neg ? `(${grouped(",")}.${frac})` : `${grouped(",")}.${frac}`, decimal: "." };
      case 3: return { text: `${grouped(",")}.${frac}${neg ? "-" : ""}`, decimal: "." };
      case 4: return { text: `${grouped(".")},${frac}${neg ? " DR" : " CR"}`, decimal: "," };
      default: return { text: `${neg ? "-" : ""}${grouped(" ")},${frac} €`, decimal: "," };
    }
  };

  test("round trip: every bank rendering of an amount parses back to it", () => {
    fc.assert(
      fc.property(milliunits, fc.integer({ min: 0, max: 5 }), (m, style) => {
        const { text, decimal } = render(m, style);
        const result = parseAmount(text, decimal);
        expect(result.ok && result.milliunits).toBe(m);
      }),
      { numRuns: 2000 },
    );
  });

  test("never returns a non-integer or out-of-range value, whatever the input", () => {
    fc.assert(
      fc.property(fc.string(), fc.constantFrom<"." | ",">(".", ","), (s, decimal) => {
        const result = parseAmount(s, decimal);
        if (result.ok) {
          expect(Number.isSafeInteger(result.milliunits)).toBe(true);
          expect(Math.abs(result.milliunits)).toBeLessThanOrEqual(MAX_MILLIUNITS);
        }
      }),
      { numRuns: 2000 },
    );
  });
});

describe("combineDebitCredit", () => {
  const combined = (d?: string, c?: string) => {
    const result = combineDebitCredit(d, c);
    return result.ok ? result : { ok: false as const, error: result.error };
  };

  test("debit is money out", () => expect(combined("54.20", "")).toEqual({ ok: true, milliunits: -54_200, warnings: [] }));
  test("credit is money in", () => expect(combined("", "2,412.50")).toEqual({ ok: true, milliunits: 2_412_500, warnings: [] }));
  test("a debit already written negative is still money out", () => {
    expect(combined("-54.20", "")).toMatchObject({ milliunits: -54_200 });
  });
  test("both empty is an error", () => expect(combined("", " ")).toEqual({ ok: false, error: "Both debit and credit are empty" }));
  test("both filled warns and nets them", () => {
    expect(combined("10.00", "25.00")).toEqual({
      ok: true,
      milliunits: 15_000,
      warnings: ["Both debit and credit have a value; used credit minus debit"],
    });
  });
  test("a zero in the other column is not a conflict", () => {
    expect(combined("10.00", "0.00")).toEqual({ ok: true, milliunits: -10_000, warnings: [] });
  });
  test("errors name the column", () => expect(combined("abc", "")).toMatchObject({ error: expect.stringContaining("Debit:") }));
});

describe("detectDecimalSeparator", () => {
  test("dot files", () => expect(detectDecimalSeparator(["-54.20", "$1,234.56", "12"])).toBe("."));
  test("comma files", () => expect(detectDecimalSeparator(["-54,20", "2.412,50", "-1.150,00"])).toBe(","));
  test("defaults to dot when nothing tells", () => expect(detectDecimalSeparator(["12", "1,234"])).toBe("."));
});

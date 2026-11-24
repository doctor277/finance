import { describe, expect, test } from "bun:test";
import Papa from "papaparse";

import { analyzeCsv, validateRows } from "@/lib/import";
import { parseAmount } from "@/lib/import/amounts";
import { parseCsv } from "@/lib/import/csv";
import { parseDate } from "@/lib/import/dates";
import { buildSkippedRowsCsv } from "@/lib/import/report";
import { escapeCsvCell } from "@/lib/csv-safety";
import { buildTransactionsCsv } from "@/lib/reports";

/** Bugs found in an independent review of this branch; each test failed before its fix. */

describe("CSV formula injection", () => {
  test.each([
    "=1+1",
    "@SUM(A1)",
    "+1+1",
    "-2+3+cmd|' /C calc'!A0",
    "-cmd",
    "\tTAB",
  ])("text starting a formula is escaped: %s", (value) => {
    expect(escapeCsvCell(value)).toBe(`'${value}`);
  });

  test.each(["-12.50", "+12.50", "-$1,234.56", "1 234,50", "12", "(64.99)", "Coffee"])(
    "plain numbers and normal text are untouched: %s",
    (value) => {
      expect(escapeCsvCell(value)).toBe(value);
    },
  );

  test("transaction export escapes payee and notes", () => {
    const csv = buildTransactionsCsv([
      { date: "2026-01-01", account: "Chq", category: null, payee: "-2+3+cmd|' /C calc'!A0", amount: -1_000, notes: "+1+1" },
    ]);
    const [, row] = Papa.parse<string[]>(csv).data;
    expect(row[3]).toBe("'-2+3+cmd|' /C calc'!A0");
    expect(row[4]).toBe("-1.00");
    expect(row[5]).toBe("'+1+1");
  });

  test("skipped-rows export escapes raw cells but keeps raw amounts readable", () => {
    const file = parseCsv("Date,Payee,Amount\n2026-01-01,-2+3+cmd,abc\n2026-01-02,,-12.50");
    const rows = validateRows(file, {
      mapping: { date: 0, payee: 1, amount: 2 },
      dateFormat: "yyyy-MM-dd",
      decimalSeparator: ".",
    });
    const csv = buildSkippedRowsCsv(file.headers, rows.map((row) => ({ row, reason: "x" })));
    const data = Papa.parse<string[]>(csv).data;
    expect(data[1][3]).toBe("'-2+3+cmd");
    expect(data[2][4]).toBe("-12.50");
  });
});

describe("decimal comma with whole amounts", () => {
  test("1.200 style amounts vote for a decimal comma", () => {
    const analysis = analyzeCsv("Datum;Beschreibung;Betrag\n15.01.2026;Miete;-1.200\n16.01.2026;Gehalt;3.500");
    expect(analysis.decimalSeparator).toBe(",");
    const rows = validateRows(analysis.file, {
      mapping: analysis.mapping,
      dateFormat: analysis.dateGuess.format!,
      decimalSeparator: analysis.decimalSeparator,
    });
    expect(rows.map((r) => r.amount)).toEqual([-1_200_000, 3_500_000]);
  });

  test("three decimals in dot mode is allowed but flagged", () => {
    expect(parseAmount("1.200")).toEqual({
      ok: true,
      milliunits: 1_200,
      warnings: ['"1.200" has 3 decimal places; check the decimal separator'],
    });
  });
});

describe("header detection", () => {
  test("a data row whose text looks like header words is not taken as the header", () => {
    const file = parseCsv(
      "01/02/2026,Coffee,-4.50\n01/03/2026,Lunch,-12.00\n01/04/2026,Deposit,Reference,500.00\n01/05/2026,Tea,-3.00",
    );
    expect(file.hasHeader).toBe(false);
    expect(file.skippedPreambleLines).toBe(0);
    expect(file.rows.map((r) => r.line)).toEqual([1, 2, 3, 4]);
  });

  test("a real header after a preamble is still found", () => {
    const file = parseCsv("Statement ****1\n\nDate,Payee,Amount\n2026-01-01,Deposit,1.00");
    expect(file.hasHeader).toBe(true);
    expect(file.headers).toEqual(["Date", "Payee", "Amount"]);
    expect(file.rows).toHaveLength(1);
  });
});

describe("two-digit years", () => {
  const thisYear = new Date().getFullYear();
  const yy = (y: number) => String(y % 100).padStart(2, "0");

  test("99 is 1999, not 2099", () => {
    expect(parseDate("12/31/99", "MM/dd/yyyy")).toEqual({ ok: true, date: "1999-12-31" });
    expect(parseDate("31/12/99", "dd/MM/yyyy")).toEqual({ ok: true, date: "1999-12-31" });
  });

  test("this year and next year stay in this century", () => {
    expect(parseDate(`01/15/${yy(thisYear)}`, "MM/dd/yyyy")).toEqual({ ok: true, date: `${thisYear}-01-15` });
    expect(parseDate(`01/15/${yy(thisYear + 1)}`, "MM/dd/yyyy")).toEqual({ ok: true, date: `${thisYear + 1}-01-15` });
  });
});

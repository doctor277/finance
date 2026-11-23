import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

import { analyzeCsv, summarize, validateRows } from "@/lib/import";

const TODAY = new Date(2026, 10, 23);

const run = (name: string) => {
  const analysis = analyzeCsv(readFileSync(`public/samples/${name}`, "utf8"));
  const rows = validateRows(analysis.file, {
    mapping: analysis.mapping,
    dateFormat: analysis.dateGuess.format!,
    decimalSeparator: analysis.decimalSeparator,
    today: TODAY,
  });
  return { ...analysis, rows, summary: summarize(rows) };
};

describe("sample bank exports (public/samples/*.csv)", () => {
  test("01 clean ISO file: everything valid", () => {
    const r = run("01-clean-iso-dates.csv");
    expect(r.mapping).toEqual({ date: 0, payee: 1, amount: 2, notes: 3 });
    expect(r.summary).toEqual({ total: 8, valid: 8, warnings: 0, errors: 0, duplicates: 0 });
  });

  test("02 two description columns, M/D/YYYY, CAD$ column", () => {
    const r = run("02-chequing-two-description-columns.csv");
    expect(r.mapping).toEqual({ date: 2, payee: 4, notes: 5, amount: 6 });
    expect(r.dateGuess).toMatchObject({ format: "MM/dd/yyyy", ambiguous: false });
    expect(r.summary.valid).toBe(7);
    expect(r.rows[0]).toMatchObject({ date: "2026-11-03", payee: "GROCERY OUTLET #112", notes: "POS PURCHASE", amount: -61_080 });
  });

  test("03 no header, debit/credit columns, ambiguous dates", () => {
    const r = run("03-no-header-debit-credit.csv");
    expect(r.file.hasHeader).toBe(false);
    expect(r.mapping).toEqual({ date: 0, payee: 1, debit: 2, credit: 3 });
    expect(r.dateGuess).toMatchObject({ format: "MM/dd/yyyy", ambiguous: true });
    expect(r.rows.map((x) => x.amount).slice(0, 2)).toEqual([-54_200, 2_412_500]);
    expect(r.summary.valid).toBe(8);
  });

  test("04 semicolons, DD.MM.YYYY and decimal comma", () => {
    const r = run("04-semicolon-decimal-comma.csv");
    expect(r.file.delimiter).toBe(";");
    expect(r.decimalSeparator).toBe(",");
    expect(r.dateGuess.format).toBe("dd/MM/yyyy");
    expect(r.rows.find((x) => x.payee === "Miete Hausverwaltung")).toMatchObject({ date: "2026-11-15", amount: -1_150_000 });
    expect(r.summary.valid).toBe(6);
  });

  test("05 messy export: every row lands in the right bucket for the right reason", () => {
    const r = run("05-messy-bank-export.csv");
    expect(r.file.skippedPreambleLines).toBe(2);
    expect(r.file.blankLines).toBe(2);
    expect(r.summary).toEqual({ total: 19, valid: 9, warnings: 4, errors: 6, duplicates: 0 });

    const byLine = Object.fromEntries(r.rows.map((x) => [x.line, x]));
    const errors = (line: number) => byLine[line].issues.filter((i) => i.severity === "error").map((i) => i.message);

    expect(byLine[5]).toMatchObject({ payee: "RENT - MAPLE PROPERTY MGMT", amount: -1_850_000 });
    expect(byLine[8]).toMatchObject({ payee: "AMAZON.CA, MARKETPLACE", amount: -64_990 });
    expect(byLine[11].amount).toBe(-12_500); // "12.50-"
    expect(byLine[16].amount).toBe(45_000); // "45.00 CR"
    expect(byLine[17].amount).toBe(-82_170); // "82.17 DR"
    expect(byLine[23].payee).toBe("FRESHCO DANFORTH");

    expect(errors(12)).toEqual(["Payee is empty"]);
    expect(errors(13)).toEqual(['"2026-02-30" is not a real calendar date']);
    expect(errors(14)).toEqual(['"N/A" is not a valid amount']);
    expect(errors(15)).toEqual(['"11/09/2026" does not match the date format YYYY-MM-DD']);
    expect(errors(18)).toEqual(["Amount is empty"]);
    expect(errors(24)).toHaveLength(2); // the "Total" footer

    expect(byLine[7].issues[0].message).toContain("as line 6");
    expect(byLine[20].issues[0].message).toContain("Rounded");
    expect(byLine[21].issues[0].message).toBe("Amount is zero");
    expect(byLine[22].issues[0].message).toContain("in the future");
  });
});

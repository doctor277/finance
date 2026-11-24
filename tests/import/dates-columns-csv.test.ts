import { describe, expect, test } from "bun:test";

import { detectMapping, matchHeader, validateMapping } from "@/lib/import/columns";
import { parseCsv } from "@/lib/import/csv";
import { detectDateFormat, parseDate } from "@/lib/import/dates";

describe("parseDate", () => {
  test.each([
    ["2026-01-15", "yyyy-MM-dd", "2026-01-15"],
    ["2026/1/5", "yyyy-MM-dd", "2026-01-05"],
    ["2026-01-15 13:45:00", "yyyy-MM-dd", "2026-01-15"],
    ["2026-01-15T23:30:00Z", "yyyy-MM-dd", "2026-01-15"],
    ["01/15/2026", "MM/dd/yyyy", "2026-01-15"],
    ["1/5/26", "MM/dd/yyyy", "2026-01-05"],
    ["01/15/2026 1:45 PM", "MM/dd/yyyy", "2026-01-15"],
    ["15/01/2026", "dd/MM/yyyy", "2026-01-15"],
    ["15.01.2026", "dd/MM/yyyy", "2026-01-15"],
    ["15-01-2026", "dd/MM/yyyy", "2026-01-15"],
    ["20260115", "yyyyMMdd", "2026-01-15"],
    ["15 Jan 2026", "d MMM yyyy", "2026-01-15"],
    ["15-JAN-26", "d MMM yyyy", "2026-01-15"],
    ["5 Sept 2026", "d MMM yyyy", "2026-09-05"],
    ["Jan 15, 2026", "MMM d yyyy", "2026-01-15"],
    ["January 3rd 2026", "MMM d yyyy", "2026-01-03"],
    ["2024-02-29", "yyyy-MM-dd", "2024-02-29"],
  ] as const)("%s as %s -> %s", (raw, format, expected) => {
    expect(parseDate(raw, format)).toEqual({ ok: true, date: expected });
  });

  test("an impossible day is a calendar error, not a format error", () => {
    expect(parseDate("2026-02-30", "yyyy-MM-dd")).toEqual({ ok: false, reason: "calendar" });
    expect(parseDate("2025-02-29", "yyyy-MM-dd")).toEqual({ ok: false, reason: "calendar" });
    expect(parseDate("13/13/2026", "MM/dd/yyyy")).toEqual({ ok: false, reason: "calendar" });
  });

  test("wrong shape and empty cells are reported separately", () => {
    expect(parseDate("11/09/2026", "yyyy-MM-dd")).toEqual({ ok: false, reason: "format" });
    expect(parseDate("Total", "yyyy-MM-dd")).toEqual({ ok: false, reason: "format" });
    expect(parseDate("  ", "yyyy-MM-dd")).toEqual({ ok: false, reason: "empty" });
  });

  test("years outside 1900-2100 are rejected", () => {
    expect(parseDate("1850-01-01", "yyyy-MM-dd").ok).toBe(false);
  });
});

describe("detectDateFormat", () => {
  test("a day above 12 settles MM/DD vs DD/MM", () => {
    expect(detectDateFormat(["03/04/2026", "11/15/2026"])).toEqual({
      format: "MM/dd/yyyy", ambiguous: false, candidates: ["MM/dd/yyyy"],
    });
    expect(detectDateFormat(["03/04/2026", "15/11/2026"])).toMatchObject({ format: "dd/MM/yyyy", ambiguous: false });
  });

  test("all days <= 12 is ambiguous and defaults to MM/DD", () => {
    expect(detectDateFormat(["03/04/2026", "11/02/2026"])).toEqual({
      format: "MM/dd/yyyy", ambiguous: true, candidates: ["MM/dd/yyyy", "dd/MM/yyyy"],
    });
  });

  test("tolerates a few bad cells (totals, blanks) but needs 80%", () => {
    const good = Array(9).fill("2026-01-15");
    expect(detectDateFormat([...good, "Total", ""]).format).toBe("yyyy-MM-dd");
    expect(detectDateFormat(["2026-01-15", "x", "y"]).format).toBeNull();
  });
});

describe("column detection", () => {
  test.each([
    ["Transaction Date", "date"],
    ["Posting Date", "date"],
    ["Description 1", "payee"],
    ["Description 2", "notes"],
    ["CAD$", "amount"],
    ["Amount (EUR)", "amount"],
    ["Withdrawals", "debit"],
    ["Deposit Amt", "credit"],
    ["Counterparty", "payee"],
    ["  MEMO ", "notes"],
    ["Montant", "amount"],
  ] as const)("%s -> %s", (header, field) => {
    expect(matchHeader(header)?.field).toBe(field);
  });

  test.each(["Balance", "Running Balance", "Account Number", "Cheque Number", "Foo"])("%s is never mapped", (header) => {
    expect(matchHeader(header)).toBeNull();
  });

  test("prefers the stronger alias when two columns fit", () => {
    const mapping = detectMapping(["Posting Date", "Transaction Date", "Description", "Amount"], []);
    expect(mapping.date).toBe(1);
  });

  test("prefers debit/credit over a generic amount column", () => {
    const mapping = detectMapping(["Date", "Payee", "Amount", "Debit", "Credit"], []);
    expect(mapping).toEqual({ date: 0, payee: 1, debit: 3, credit: 4 });
  });

  test("infers columns from content when there is no header", () => {
    const rows = [
      ["11/02/2026", "GROCERY", "54.20", "", "1245.80"],
      ["11/03/2026", "PAYROLL", "", "2412.50", "3658.30"],
      ["11/04/2026", "TRANSIT", "3.35", "", "3654.95"],
    ];
    expect(detectMapping(["Column 1", "Column 2", "Column 3", "Column 4", "Column 5"], rows)).toEqual({
      date: 0, payee: 1, debit: 2, credit: 3,
    });
  });

  test("a single numeric column becomes the amount", () => {
    const rows = [["2026-01-01", "A", "-1.00"], ["2026-01-02", "B", "2.00"]];
    expect(detectMapping(["Column 1", "Column 2", "Column 3"], rows)).toEqual({ date: 0, amount: 2, payee: 1 });
  });

  test("validateMapping lists what is missing", () => {
    expect(validateMapping({})).toHaveLength(3);
    expect(validateMapping({ date: 0, payee: 1, credit: 2 })).toEqual([]);
    expect(validateMapping({ date: 0, payee: 1, amount: 2, debit: 3 })).toEqual([
      "Use either one Amount column or Debit/Credit columns, not both.",
    ]);
  });
});

describe("parseCsv", () => {
  test("strips the BOM, skips the preamble and blank lines, keeps real line numbers", () => {
    const file = parseCsv("﻿Statement ****1\nGenerated today\n\nDate,Payee,Amount\n2026-01-01,A,1\n\n2026-01-02,B,2\n");
    expect(file.headers).toEqual(["Date", "Payee", "Amount"]);
    expect(file.hasHeader).toBe(true);
    expect(file.skippedPreambleLines).toBe(2);
    expect(file.blankLines).toBe(2);
    expect(file.rows.map((r) => r.line)).toEqual([5, 7]);
  });

  test("detects semicolon, tab and pipe delimiters", () => {
    for (const d of [";", "\t", "|"]) {
      const file = parseCsv(`Date${d}Payee${d}Amount\n2026-01-01${d}A${d}1,50`);
      expect(file.delimiter).toBe(d);
      expect(file.rows[0].cells).toEqual(["2026-01-01", "A", "1,50"]);
    }
  });

  test("keeps commas and quotes inside quoted cells", () => {
    const file = parseCsv('Date,Payee,Amount\n2026-01-01,"AMAZON.CA, MARKETPLACE",-1\n2026-01-01,"Say ""hi""",-2');
    expect(file.rows.map((r) => r.cells[1])).toEqual(["AMAZON.CA, MARKETPLACE", 'Say "hi"']);
  });

  test("handles CRLF line endings", () => {
    const file = parseCsv("Date,Payee,Amount\r\n2026-01-01,A,1\r\n2026-01-02,B,2\r\n");
    expect(file.rows).toHaveLength(2);
    expect(file.blankLines).toBe(0);
  });

  test("a file whose first row is data has no header", () => {
    const file = parseCsv("2026-01-01,Coffee,-4.50\n2026-01-02,Tea,-3.00");
    expect(file.hasHeader).toBe(false);
    expect(file.headers).toEqual(["Column 1", "Column 2", "Column 3"]);
    expect(file.rows).toHaveLength(2);
  });

  test("short rows are padded to the header width", () => {
    const file = parseCsv("Date,Payee,Amount,Notes\n2026-01-01,A,1");
    expect(file.rows[0].cells).toEqual(["2026-01-01", "A", "1", ""]);
  });

  test("an empty file has no rows", () => {
    expect(parseCsv("\n\n").rows).toEqual([]);
    expect(parseCsv("").headers).toEqual([]);
  });
});

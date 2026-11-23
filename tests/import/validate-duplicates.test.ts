import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import Papa from "papaparse";

import { matchExisting, findRepeatsInFile, normalizePayee } from "@/lib/import/duplicates";
import { parseCsv } from "@/lib/import/csv";
import { applyDuplicates, buildSkippedRowsCsv, reasonFor, summarize } from "@/lib/import/report";
import type { ImportOptions } from "@/lib/import/types";
import { cleanText, validateRows } from "@/lib/import/validate";

const TODAY = new Date(2026, 10, 23);
const opts = (overrides: Partial<ImportOptions> = {}): ImportOptions => ({
  mapping: { date: 0, payee: 1, amount: 2, notes: 3 },
  dateFormat: "yyyy-MM-dd",
  decimalSeparator: ".",
  today: TODAY,
  ...overrides,
});
const rowsOf = (csv: string, o?: Partial<ImportOptions>) => validateRows(parseCsv(csv), opts(o));

describe("cleanText", () => {
  test("trims, collapses whitespace, drops zero-width chars and wrapping quotes", () => {
    expect(cleanText("   FRESHCO   DANFORTH  ")).toBe("FRESHCO DANFORTH");
    expect(cleanText("A​B")).toBe("AB");
    expect(cleanText("'quoted'")).toBe("quoted");
    expect(cleanText(undefined)).toBe("");
  });
});

describe("validateRows", () => {
  test("a clean row is valid with cleaned values", () => {
    const [row] = rowsOf("Date,Payee,Amount,Notes\n2026-11-01,  Rent  ,\"-1,850.00\",  Nov  ");
    expect(row).toMatchObject({
      line: 2, status: "valid", date: "2026-11-01", payee: "Rent", amount: -1_850_000, notes: "Nov", issues: [],
    });
  });

  test("every problem on a row is reported, each with its reason", () => {
    const [row] = rowsOf("Date,Payee,Amount,Notes\nTotal,,abc,");
    expect(row.status).toBe("error");
    expect(row.issues.map((i) => i.message)).toEqual([
      '"Total" does not match the date format YYYY-MM-DD',
      "Payee is empty",
      '"abc" is not a valid amount',
    ]);
  });

  test("warnings do not block a row", () => {
    const rows = rowsOf("Date,Payee,Amount\n2026-12-24,Future,-1\n2026-11-01,Zero,0\n2026-11-01,Round,1.23456");
    expect(rows.map((r) => r.status)).toEqual(["warning", "warning", "warning"]);
    expect(rows[0].issues[0].message).toBe("Date 2026-12-24 is in the future");
  });

  test("long payees and notes are shortened with a warning", () => {
    const [row] = rowsOf(`Date,Payee,Amount,Notes\n2026-11-01,${"x".repeat(250)},-1,${"n".repeat(1200)}`);
    expect(row.payee).toHaveLength(200);
    expect(row.notes).toHaveLength(1000);
    expect(row.status).toBe("warning");
  });

  test("debit/credit mapping produces signed amounts", () => {
    const rows = rowsOf("Date,Payee,Debit,Credit\n2026-11-01,Out,10.00,\n2026-11-02,In,,25.00", {
      mapping: { date: 0, payee: 1, debit: 2, credit: 3 },
    });
    expect(rows.map((r) => r.amount)).toEqual([-10_000, 25_000]);
  });

  test("identical rows in the same file are flagged but kept", () => {
    const rows = rowsOf("Date,Payee,Amount\n2026-11-03,Coffee,-4.75\n2026-11-03,COFFEE,-4.75");
    expect(rows[0].status).toBe("valid");
    expect(rows[1].status).toBe("warning");
    expect(rows[1].issues[0].message).toContain("Same date, amount and payee as line 2");
  });
});

describe("duplicates", () => {
  test("payee normalization ignores case, accents, punctuation and spacing", () => {
    expect(normalizePayee("AMAZON.CA,  Marketplace")).toBe(normalizePayee("amazon ca marketplace"));
    expect(normalizePayee("Café Crème")).toBe("cafe creme");
  });

  test("normalization is idempotent", () => {
    fc.assert(fc.property(fc.string(), (s) => normalizePayee(normalizePayee(s)) === normalizePayee(s)));
  });

  test("matches on date, amount and payee", () => {
    const existing = [{ id: "t1", date: "2026-11-01", amount: -1_850_000, payee: "Rent - Maple Property Mgmt" }];
    expect(
      matchExisting(
        [
          { date: "2026-11-01", amount: -1_850_000, payee: "RENT - MAPLE PROPERTY MGMT" },
          { date: "2026-11-02", amount: -1_850_000, payee: "RENT - MAPLE PROPERTY MGMT" },
          { date: "2026-11-01", amount: -1_850_001, payee: "RENT - MAPLE PROPERTY MGMT" },
        ],
        existing,
      ),
    ).toEqual(["t1", null, null]);
  });

  test("matching is one-to-one: a second identical purchase is new", () => {
    const coffee = { date: "2026-11-03", amount: -4_750, payee: "Tim Hortons" };
    expect(matchExisting([coffee, coffee], [{ ...coffee, id: "t1" }])).toEqual(["t1", null]);
    expect(matchExisting([coffee, coffee], [{ ...coffee, id: "t1" }, { ...coffee, id: "t2" }])).toEqual(["t1", "t2"]);
  });

  test("rows with missing fields never match", () => {
    expect(matchExisting([{ date: null, amount: -1, payee: "x" }], [{ id: "t", date: null, amount: -1, payee: "x" }])).toEqual([null]);
  });

  test("property: never flags more rows than there are existing transactions, never reuses an id", () => {
    const tx = fc.record({
      date: fc.constantFrom("2026-11-01", "2026-11-02"),
      amount: fc.constantFrom(-1000, -2000),
      payee: fc.constantFrom("A", "a", "B"),
    });
    fc.assert(
      fc.property(fc.array(tx, { maxLength: 30 }), fc.array(tx, { maxLength: 30 }), (incoming, existingRaw) => {
        const existing = existingRaw.map((t, i) => ({ ...t, id: `e${i}` }));
        const result = matchExisting(incoming, existing);
        const used = result.filter((id): id is string => id !== null);
        expect(new Set(used).size).toBe(used.length);
        expect(used.length).toBeLessThanOrEqual(existing.length);
        // a matched pair really is the same transaction
        result.forEach((id, i) => {
          if (!id) return;
          const e = existing.find((x) => x.id === id)!;
          expect([e.date, e.amount, normalizePayee(e.payee)]).toEqual([
            incoming[i].date, incoming[i].amount, normalizePayee(incoming[i].payee),
          ]);
        });
      }),
    );
  });

  test("findRepeatsInFile points at the first occurrence", () => {
    const a = { date: "2026-01-01", amount: 1, payee: "a" };
    const b = { date: "2026-01-01", amount: 2, payee: "a" };
    expect(findRepeatsInFile([a, b, a, a])).toEqual([null, null, 0, 0]);
  });
});

describe("report", () => {
  const rows = rowsOf("Date,Payee,Amount,Notes\n2026-11-01,Rent,-1850,\n2026-11-02,,abc,\n2026-11-03,Coffee,-4.75,");

  test("applyDuplicates marks matches, but an error stays an error", () => {
    const marked = applyDuplicates(rows, ["t1", "t2", null]);
    expect(marked.map((r) => r.status)).toEqual(["duplicate", "error", "valid"]);
    expect(marked[0].duplicateOf).toBe("t1");
    expect(marked[1].duplicateOf).toBeNull();
    expect(summarize(marked)).toEqual({ total: 3, valid: 1, warnings: 0, errors: 1, duplicates: 1 });
  });

  test("reasons are human readable", () => {
    const marked = applyDuplicates(rows, ["t1", null, null]);
    expect(reasonFor(marked[0])).toBe("Duplicate of a transaction already in this account");
    expect(reasonFor(marked[1])).toBe('Payee is empty; "abc" is not a valid amount');
    expect(reasonFor(marked[2])).toBe("Excluded by user");
  });

  test("skipped-rows CSV keeps line, reason and original cells, and reopens cleanly", () => {
    const csv = buildSkippedRowsCsv(["Date", "Payee", "Amount", "Notes"], [{ row: rows[1], reason: reasonFor(rows[1]) }]);
    const parsed = Papa.parse<string[]>(csv).data;
    expect(parsed[0]).toEqual(["Line", "Reason", "Date", "Payee", "Amount", "Notes"]);
    expect(parsed[1]).toEqual(["3", 'Payee is empty; "abc" is not a valid amount', "2026-11-02", "", "abc", ""]);
  });

  test("formula-looking cells are neutralized, negative amounts are not", () => {
    const [row] = rowsOf('Date,Payee,Amount\n2026-11-12,"=HYPERLINK(""http://x"")",');
    const csv = buildSkippedRowsCsv(["Date", "Payee", "Amount"], [{ row: { ...row, raw: [...row.raw.slice(0, 2), "-12.50"] }, reason: "x" }]);
    const cells = Papa.parse<string[]>(csv).data[1];
    expect(cells[3]).toBe("'=HYPERLINK(\"http://x\")");
    expect(cells[4]).toBe("-12.50");
  });
});

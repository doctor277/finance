import Papa from "papaparse";

import type { ParsedRow } from "@/lib/import/types";

export type ImportSummary = {
  total: number;
  valid: number;
  warnings: number;
  errors: number;
  duplicates: number;
};

export function summarize(rows: ParsedRow[]): ImportSummary {
  return {
    total: rows.length,
    valid: rows.filter((r) => r.status === "valid").length,
    warnings: rows.filter((r) => r.status === "warning").length,
    errors: rows.filter((r) => r.status === "error").length,
    duplicates: rows.filter((r) => r.status === "duplicate").length,
  };
}

/** Marks rows that match an existing transaction. Rows with errors stay errors. */
export function applyDuplicates(rows: ParsedRow[], duplicateOf: (string | null)[]): ParsedRow[] {
  return rows.map((row, i) => {
    const match = duplicateOf[i] ?? null;
    if (!match || row.status === "error") return { ...row, duplicateOf: null };
    return { ...row, duplicateOf: match, status: "duplicate" };
  });
}

export type SkippedRow = { row: ParsedRow; reason: string };

/** Why a row was not imported, in words the user can act on. */
export function reasonFor(row: ParsedRow): string {
  if (row.status === "error") {
    return row.issues
      .filter((i) => i.severity === "error")
      .map((i) => i.message)
      .join("; ");
  }
  if (row.status === "duplicate") return "Duplicate of a transaction already in this account";
  return "Excluded by user";
}

/**
 * CSV of every row that was not imported: its original line number, the reason,
 * then the original cells under the original headers, so the user can fix the
 * rows in a spreadsheet and import that file again.
 */
export function buildSkippedRowsCsv(headers: string[], skipped: SkippedRow[]): string {
  return Papa.unparse({
    fields: ["Line", "Reason", ...headers],
    data: skipped.map(({ row, reason }) => [String(row.line), reason, ...row.raw.slice(0, headers.length)]),
  }, {
    // Neutralize spreadsheet formulas (CSV injection) without mangling negative
    // amounts like "-12.50": only "=", "@", tab/CR, or +/- followed by a non-number.
    escapeFormulae: /^([=@\t\r]|[+-][^\d.,\s])/,
  });
}

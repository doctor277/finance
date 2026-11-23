import { combineDebitCredit, parseAmount } from "@/lib/import/amounts";
import { parseDate } from "@/lib/import/dates";
import { findRepeatsInFile } from "@/lib/import/duplicates";
import { DATE_FORMAT_LABELS } from "@/lib/import/types";
import type { ImportOptions, ParsedFile, ParsedRow, RowIssue } from "@/lib/import/types";
import { toDateKey } from "@/lib/dates";

export const MAX_PAYEE_LENGTH = 200;
export const MAX_NOTES_LENGTH = 1000;

/** Trims, collapses inner whitespace, drops zero-width characters and wrapping quotes. */
export function cleanText(raw: string | undefined): string {
  let value = (raw ?? "").replace(/[​-‍﻿]/g, "").replace(/\s+/g, " ").trim();
  if (value.length >= 2 && /^(["']).*\1$/.test(value)) value = value.slice(1, -1).trim();
  return value;
}

const statusOf = (issues: RowIssue[]) =>
  issues.some((i) => i.severity === "error")
    ? "error"
    : issues.some((i) => i.severity === "warning")
      ? "warning"
      : "valid";

/**
 * Cleans and validates every data row against the chosen mapping. Each problem
 * becomes an issue with a plain-language reason; rows with any error are
 * rejected, rows with only warnings can still be imported.
 */
export function validateRows(file: ParsedFile, options: ImportOptions): ParsedRow[] {
  const { mapping, dateFormat, decimalSeparator } = options;
  const todayKey = toDateKey(options.today ?? new Date());
  const cell = (cells: string[], index: number | undefined) =>
    index === undefined ? undefined : cells[index];

  const rows = file.rows.map(({ line, cells }): ParsedRow => {
    const issues: RowIssue[] = [];

    // Date
    let date: string | null = null;
    const rawDate = cell(cells, mapping.date) ?? "";
    const parsedDate = parseDate(rawDate, dateFormat);
    if (parsedDate.ok) {
      date = parsedDate.date;
      if (date > todayKey) {
        issues.push({ field: "date", severity: "warning", message: `Date ${date} is in the future` });
      }
    } else if (parsedDate.reason === "empty") {
      issues.push({ field: "date", severity: "error", message: "Date is empty" });
    } else if (parsedDate.reason === "calendar") {
      issues.push({ field: "date", severity: "error", message: `"${rawDate.trim()}" is not a real calendar date` });
    } else {
      issues.push({
        field: "date",
        severity: "error",
        message: `"${rawDate.trim()}" does not match the date format ${DATE_FORMAT_LABELS[dateFormat].split(" ")[0]}`,
      });
    }

    // Payee
    let payee: string | null = cleanText(cell(cells, mapping.payee));
    if (payee === "") {
      payee = null;
      issues.push({ field: "payee", severity: "error", message: "Payee is empty" });
    } else if (payee.length > MAX_PAYEE_LENGTH) {
      payee = payee.slice(0, MAX_PAYEE_LENGTH);
      issues.push({ field: "payee", severity: "warning", message: `Payee shortened to ${MAX_PAYEE_LENGTH} characters` });
    }

    // Amount
    let amount: number | null = null;
    const amountResult =
      mapping.amount !== undefined
        ? parseAmount(cell(cells, mapping.amount) ?? "", decimalSeparator)
        : combineDebitCredit(cell(cells, mapping.debit), cell(cells, mapping.credit), decimalSeparator);
    if (amountResult.ok) {
      amount = amountResult.milliunits;
      for (const message of amountResult.warnings) {
        issues.push({ field: "amount", severity: "warning", message });
      }
      if (amount === 0) {
        issues.push({ field: "amount", severity: "warning", message: "Amount is zero" });
      }
    } else {
      issues.push({ field: "amount", severity: "error", message: amountResult.error });
    }

    // Notes (optional)
    let notes: string | null = cleanText(cell(cells, mapping.notes)) || null;
    if (notes && notes.length > MAX_NOTES_LENGTH) {
      notes = notes.slice(0, MAX_NOTES_LENGTH);
      issues.push({ field: "notes", severity: "warning", message: `Notes shortened to ${MAX_NOTES_LENGTH} characters` });
    }

    return { line, raw: cells, date, payee, amount, notes, issues, status: statusOf(issues), duplicateOf: null };
  });

  // Identical rows inside one file are often real (two coffees on the same day),
  // so they are only flagged, never dropped.
  const repeats = findRepeatsInFile(rows);
  rows.forEach((row, i) => {
    const earlier = repeats[i];
    if (earlier !== null && row.status !== "error") {
      row.issues.push({
        field: "row",
        severity: "warning",
        message: `Same date, amount and payee as line ${rows[earlier].line} (kept: it may be a second real purchase)`,
      });
      row.status = statusOf(row.issues);
    }
  });

  return rows;
}

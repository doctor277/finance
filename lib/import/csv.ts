import Papa from "papaparse";

import { looksLikeAmount } from "@/lib/import/amounts";
import { looksLikeHeaderRow } from "@/lib/import/columns";
import { looksLikeDate } from "@/lib/import/dates";
import type { ParsedFile } from "@/lib/import/types";

export const MAX_IMPORT_ROWS = 5000;

const isBlank = (cells: string[]) => cells.every((cell) => cell.trim() === "");

/**
 * Reads CSV text into a header row and data rows.
 *
 * - Detects the delimiter (comma, semicolon, tab or pipe) and strips a UTF-8 BOM.
 * - Drops blank lines but counts them, so the summary can report them.
 * - Skips statement preambles ("Account: ****1234", "Generated on ...") by
 *   looking for the first row that reads like a header within the first 15 lines.
 * - Treats the file as headerless when the first row already looks like data
 *   (it has a date and an amount), and names the columns "Column 1", "Column 2"...
 */
export function parseCsv(text: string): ParsedFile {
  const content = text.replace(/^﻿/, "");

  const result = Papa.parse<string[]>(content, {
    delimitersToGuess: [",", ";", "\t", "|"],
    skipEmptyLines: false,
  });

  // Papa reports one record per row; its index + 1 is the line the user sees
  // in a spreadsheet (a quoted multi-line cell still counts as one row there).
  const records = result.data.map((cells, i) => ({
    line: i + 1,
    cells: cells.map((cell) => (cell ?? "").toString()),
  }));

  const nonBlank = records.filter((r) => !isBlank(r.cells));
  // A trailing newline produces an empty last record; don't count it as a blank line.
  const trailingEmpty = records.length > 0 && records[records.length - 1].cells.join("") === "" ? 1 : 0;
  const blankLines = records.length - nonBlank.length - trailingEmpty;

  if (nonBlank.length === 0) {
    return { headers: [], rows: [], hasHeader: false, delimiter: result.meta.delimiter, skippedPreambleLines: 0, blankLines };
  }

  const firstLooksLikeData = (cells: string[]) =>
    cells.some(looksLikeDate) && cells.some((c) => looksLikeAmount(c) && !looksLikeDate(c));

  // Only rows before the first data-looking row can be the header. Otherwise a data
  // row whose text happens to match header words ("Deposit", "Reference") would be
  // promoted to header and every row above it silently dropped as "preamble".
  const scan = nonBlank.slice(0, 15);
  const firstDataIndex = scan.findIndex((r) => firstLooksLikeData(r.cells));
  const searchEnd = firstDataIndex === -1 ? scan.length : firstDataIndex;
  let headerIndex = scan.slice(0, searchEnd).findIndex((r) => looksLikeHeaderRow(r.cells));
  let hasHeader = true;

  if (headerIndex === -1) {
    if (firstDataIndex !== -1) {
      hasHeader = false;
      headerIndex = firstDataIndex; // rows before the first data row are preamble
    } else {
      headerIndex = 0; // unknown headers: let the user map them by hand
    }
  }

  const width = Math.max(...nonBlank.slice(headerIndex).map((r) => r.cells.length));
  const pad = (cells: string[]) =>
    cells.length >= width ? cells : [...cells, ...Array(width - cells.length).fill("")];

  const headerCells = hasHeader ? pad(nonBlank[headerIndex].cells) : Array(width).fill("");
  const headers = headerCells.map((h, i) => h.trim() || `Column ${i + 1}`);

  const dataStart = hasHeader ? headerIndex + 1 : headerIndex;
  const rows = nonBlank.slice(dataStart).map((r) => ({ line: r.line, cells: pad(r.cells) }));

  return {
    headers,
    rows,
    hasHeader,
    delimiter: result.meta.delimiter,
    skippedPreambleLines: headerIndex,
    blankLines,
  };
}

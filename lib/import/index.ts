import { detectDecimalSeparator } from "@/lib/import/amounts";
import { detectMapping } from "@/lib/import/columns";
import { parseCsv } from "@/lib/import/csv";
import { detectDateFormat, type DateFormatGuess } from "@/lib/import/dates";
import type { ColumnMapping, DecimalSeparator, ParsedFile } from "@/lib/import/types";

export * from "@/lib/import/types";
export { parseAmount, combineDebitCredit, detectDecimalSeparator, MAX_MILLIUNITS } from "@/lib/import/amounts";
export { detectMapping, validateMapping, matchHeader, normalizeHeader } from "@/lib/import/columns";
export { parseCsv, MAX_IMPORT_ROWS } from "@/lib/import/csv";
export { parseDate, detectDateFormat, DATE_FORMATS } from "@/lib/import/dates";
export { matchExisting, findRepeatsInFile, normalizePayee, fingerprint } from "@/lib/import/duplicates";
export { applyDuplicates, buildSkippedRowsCsv, reasonFor, summarize } from "@/lib/import/report";
export { validateRows, cleanText } from "@/lib/import/validate";

export type FileAnalysis = {
  file: ParsedFile;
  mapping: ColumnMapping;
  dateGuess: DateFormatGuess;
  decimalSeparator: DecimalSeparator;
};

/** Samples used for detection; enough to be representative, cheap on big files. */
const SAMPLE_SIZE = 200;

/** Re-runs format detection for a mapping the user changed by hand. */
export function detectFormats(file: ParsedFile, mapping: ColumnMapping) {
  const sample = file.rows.slice(0, SAMPLE_SIZE).map((r) => r.cells);
  const pick = (i: number | undefined) => (i === undefined ? [] : sample.map((row) => row[i] ?? ""));

  return {
    dateGuess: detectDateFormat(pick(mapping.date)),
    decimalSeparator: detectDecimalSeparator([
      ...pick(mapping.amount),
      ...pick(mapping.debit),
      ...pick(mapping.credit),
    ]),
  };
}

/** First pass over an uploaded file: read it, guess the mapping and the formats. */
export function analyzeCsv(text: string): FileAnalysis {
  const file = parseCsv(text);
  const mapping = detectMapping(file.headers, file.rows.slice(0, SAMPLE_SIZE).map((r) => r.cells));
  return { file, mapping, ...detectFormats(file, mapping) };
}

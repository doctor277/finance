/** Fields a CSV column can be mapped to. Amount comes from `amount`, or from `debit`/`credit`. */
export const IMPORT_FIELDS = ["date", "payee", "amount", "debit", "credit", "notes"] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

export const FIELD_LABELS: Record<ImportField, string> = {
  date: "Date",
  payee: "Payee",
  amount: "Amount",
  debit: "Debit (money out)",
  credit: "Credit (money in)",
  notes: "Notes",
};

/** Column index for each mapped field. Unmapped fields are absent. */
export type ColumnMapping = Partial<Record<ImportField, number>>;

/** Separators are flexible: "MM/dd/yyyy" also accepts 01-15-2026 and 1.15.26. */
export type DateFormat =
  | "yyyy-MM-dd"
  | "MM/dd/yyyy"
  | "dd/MM/yyyy"
  | "yyyyMMdd"
  | "d MMM yyyy"
  | "MMM d yyyy";

export const DATE_FORMAT_LABELS: Record<DateFormat, string> = {
  "yyyy-MM-dd": "YYYY-MM-DD (2026-01-31)",
  "MM/dd/yyyy": "MM/DD/YYYY (01/31/2026)",
  "dd/MM/yyyy": "DD/MM/YYYY (31/01/2026)",
  yyyyMMdd: "YYYYMMDD (20260131)",
  "d MMM yyyy": "D MMM YYYY (31 Jan 2026)",
  "MMM d yyyy": "MMM D, YYYY (Jan 31, 2026)",
};

export type DecimalSeparator = "." | ",";

export type Severity = "warning" | "error";

export type RowIssue = {
  field: ImportField | "row";
  severity: Severity;
  message: string;
};

export type RowStatus = "valid" | "warning" | "error" | "duplicate";

/** One data row of the file after cleansing and validation. */
export type ParsedRow = {
  /** 1-based line number in the original file, for messages the user can check. */
  line: number;
  /** Original cells, untouched, used for the rejected-rows report. */
  raw: string[];
  date: string | null;
  payee: string | null;
  /** Integer milliunits. */
  amount: number | null;
  notes: string | null;
  issues: RowIssue[];
  status: RowStatus;
  /** Set when the row matches a transaction already in the account. */
  duplicateOf: string | null;
};

export type ParsedFile = {
  headers: string[];
  /** Data rows (no header, no blank lines), with their 1-based line numbers. */
  rows: { line: number; cells: string[] }[];
  hasHeader: boolean;
  delimiter: string;
  /** Lines before the header that were skipped (bank statement preambles). */
  skippedPreambleLines: number;
  /** Lines that were entirely empty and dropped. */
  blankLines: number;
};

export type ImportOptions = {
  mapping: ColumnMapping;
  dateFormat: DateFormat;
  decimalSeparator: DecimalSeparator;
  /** Used to flag dates in the future. Defaults to now. */
  today?: Date;
};

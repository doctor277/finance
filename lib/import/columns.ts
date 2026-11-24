import { looksLikeAmount } from "@/lib/import/amounts";
import { looksLikeDate } from "@/lib/import/dates";
import type { ColumnMapping, ImportField } from "@/lib/import/types";

/**
 * Header names seen in real bank exports, normalized (lowercase, accents and
 * punctuation removed). Order matters: earlier aliases win when two columns
 * could map to the same field (e.g. "Transaction Date" beats "Posting Date").
 */
const ALIASES: Record<ImportField, string[]> = {
  date: [
    "date", "transaction date", "trans date", "txn date", "posted date", "posting date",
    "date posted", "booking date", "value date", "effective date", "date operation",
  ],
  payee: [
    "payee", "description", "description 1", "merchant", "merchant name", "name",
    "transaction description", "details", "narrative", "counterparty", "beneficiary",
    "vendor", "libelle", "description payee",
  ],
  amount: [
    "amount", "transaction amount", "amt", "cad", "amount cad", "amount usd", "usd",
    "amount eur", "eur", "value", "montant", "net amount",
  ],
  debit: [
    "debit", "debits", "withdrawal", "withdrawals", "money out", "paid out", "debit amount",
    "outflow", "spent", "retrait", "withdrawal amount",
  ],
  credit: [
    "credit", "credits", "deposit", "deposits", "money in", "paid in", "credit amount",
    "inflow", "received", "depot", "deposit amount",
  ],
  notes: [
    "notes", "note", "memo", "description 2", "reference", "comment", "comments",
    "additional info", "remarks", "purpose", "reference number",
  ],
};

/** Columns that look numeric but must never be read as the transaction amount. */
const NEVER_MAP = ["balance", "running balance", "solde", "account number", "cheque number", "check number"];

export function normalizeHeader(header: string): string {
  return header
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** The field a header names, with a rank (lower is a stronger match). */
export function matchHeader(header: string): { field: ImportField; rank: number } | null {
  const h = normalizeHeader(header);
  if (!h || NEVER_MAP.includes(h)) return null;

  for (const field of Object.keys(ALIASES) as ImportField[]) {
    const index = ALIASES[field].indexOf(h);
    if (index !== -1) return { field, rank: index };
  }

  // Looser "contains" rules for headers like "Amount (CAD)" or "Withdrawal Amt".
  const contains: [RegExp, ImportField][] = [
    [/\bdate\b/, "date"],
    [/\b(debit|withdrawal|withdrawals)\b/, "debit"],
    [/\b(credit|deposit|deposits)\b/, "credit"],
    [/\b(amount|amt|montant)\b/, "amount"],
    [/\b(payee|description|merchant)\b/, "payee"],
    [/\b(memo|note|notes|reference)\b/, "notes"],
  ];
  for (const [re, field] of contains) {
    if (re.test(h) && !/\bbalance\b/.test(h)) return { field, rank: 100 };
  }
  return null;
}

/** True when a row reads like a header (two or more cells name a known field). */
export function looksLikeHeaderRow(cells: string[]): boolean {
  const fields = new Set(cells.map(matchHeader).filter(Boolean).map((m) => m!.field));
  return fields.size >= 2;
}

const share = (values: string[], test: (v: string) => boolean) => {
  const filled = values.filter((v) => v.trim() !== "");
  if (filled.length === 0) return { share: 0, filled: 0 };
  return { share: filled.filter(test).length / filled.length, filled: filled.length };
};

/**
 * Proposes a column for each field. Headers are matched first; anything still
 * missing (or every field, when the file has no header row) is inferred from
 * the cell contents of the sample rows.
 */
export function detectMapping(headers: string[], sampleRows: string[][]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const taken = new Set<number>();

  const matches = headers
    .map((header, column) => ({ column, match: matchHeader(header) }))
    .filter((m): m is { column: number; match: { field: ImportField; rank: number } } => !!m.match)
    .sort((a, b) => a.match.rank - b.match.rank || a.column - b.column);

  for (const { column, match } of matches) {
    if (mapping[match.field] === undefined && !taken.has(column)) {
      mapping[match.field] = column;
      taken.add(column);
    }
  }

  // Amount and debit/credit are alternatives; prefer the explicit pair when both exist.
  if (mapping.amount !== undefined && (mapping.debit !== undefined || mapping.credit !== undefined)) {
    taken.delete(mapping.amount);
    delete mapping.amount;
  }

  const neverMap = new Set(
    headers.map((h, i) => (NEVER_MAP.includes(normalizeHeader(h)) ? i : -1)).filter((i) => i >= 0),
  );
  const column = (i: number) => sampleRows.map((row) => row[i] ?? "");
  const free = () =>
    headers.map((_, i) => i).filter((i) => !taken.has(i) && !neverMap.has(i));

  if (mapping.date === undefined) {
    const found = free().find((i) => share(column(i), looksLikeDate).share >= 0.8);
    if (found !== undefined) {
      mapping.date = found;
      taken.add(found);
    }
  }

  const hasAmount =
    mapping.amount !== undefined || mapping.debit !== undefined || mapping.credit !== undefined;
  if (!hasAmount) {
    const numeric = free().filter((i) => share(column(i), looksLikeAmount).share >= 0.8);
    // Two neighbouring numeric columns where each row fills exactly one of them
    // are a debit/credit pair (a third, always-filled one is usually the balance).
    const pair = numeric.find((i) => {
      if (!numeric.includes(i + 1)) return false;
      const a = column(i);
      const b = column(i + 1);
      const exclusive = a.filter((v, r) => (v.trim() === "") !== ((b[r] ?? "").trim() === "")).length;
      return a.length > 0 && exclusive / a.length >= 0.9;
    });
    if (pair !== undefined) {
      mapping.debit = pair;
      mapping.credit = pair + 1;
      taken.add(pair).add(pair + 1);
    } else if (numeric.length > 0) {
      mapping.amount = numeric[0];
      taken.add(numeric[0]);
    }
  }

  if (mapping.payee === undefined) {
    const found = free().find((i) => {
      const values = column(i);
      const text = share(values, (v) => !looksLikeAmount(v) && !looksLikeDate(v));
      return text.filled > 0 && text.share >= 0.8;
    });
    if (found !== undefined) {
      mapping.payee = found;
      taken.add(found);
    }
  }

  return mapping;
}

/** Problems that block the import until the user fixes the mapping. */
export function validateMapping(mapping: ColumnMapping): string[] {
  const problems: string[] = [];
  if (mapping.date === undefined) problems.push("Choose the column that holds the date.");
  if (mapping.payee === undefined) problems.push("Choose the column that holds the payee or description.");

  const hasAmount = mapping.amount !== undefined;
  const hasDebitCredit = mapping.debit !== undefined || mapping.credit !== undefined;
  if (!hasAmount && !hasDebitCredit) {
    problems.push("Choose an Amount column, or Debit and/or Credit columns.");
  }
  if (hasAmount && hasDebitCredit) {
    problems.push("Use either one Amount column or Debit/Credit columns, not both.");
  }
  return problems;
}

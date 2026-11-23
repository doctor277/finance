import type { DecimalSeparator } from "@/lib/import/types";

/** transactions.amount is a Postgres integer of milliunits. */
export const MAX_MILLIUNITS = 2_147_483_647;

export type AmountResult =
  | { ok: true; milliunits: number; warnings: string[] }
  | { ok: false; error: string };

const CURRENCY = /(?:C\$|US\$|CA\$|CAD|USD|EUR|GBP|[$€£¥])/gi;
const SPACES = /[\s  ']/g; // spaces, NBSP, narrow NBSP, Swiss apostrophe

/**
 * Parses a bank amount cell into integer milliunits ($12.34 -> 12340) using
 * string arithmetic only, so no floating-point rounding can creep in.
 *
 * Handles: currency symbols and codes, thousands separators, decimal comma,
 * leading/trailing minus, Unicode minus, accounting parentheses "(12.50)",
 * and DR/CR suffixes (DR = money out).
 */
export function parseAmount(raw: string, decimal: DecimalSeparator = "."): AmountResult {
  const original = raw.trim();
  if (original === "") return { ok: false, error: "Amount is empty" };

  let s = original.replace(/−/g, "-"); // Unicode minus sign
  let negative = false;
  let explicitPositive = false;

  const drcr = s.match(/\s*\b(DR|CR)\.?$/i);
  if (drcr) {
    if (drcr[1].toUpperCase() === "DR") negative = true;
    else explicitPositive = true;
    s = s.slice(0, drcr.index);
  }

  s = s.replace(CURRENCY, "").trim();

  const parens = s.match(/^\((.*)\)$/);
  if (parens) {
    negative = true;
    s = parens[1].trim().replace(CURRENCY, "").trim();
  }

  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }
  if (s.endsWith("-")) {
    negative = true;
    s = s.slice(0, -1);
  }

  s = s.replace(CURRENCY, "").replace(SPACES, "");

  if (negative && explicitPositive) {
    return { ok: false, error: `"${original}" is marked both negative and CR` };
  }

  if (s === "") return { ok: false, error: `"${original}" has no number in it` };

  const thousands = decimal === "." ? "," : ".";
  const groupedPattern =
    decimal === "." ? /^\d{1,3}(,\d{3})+(\.\d+)?$/ : /^\d{1,3}(\.\d{3})+(,\d+)?$/;
  const plainPattern = decimal === "." ? /^(\d+(\.\d*)?|\.\d+)$/ : /^(\d+(,\d*)?|,\d+)$/;

  if (!plainPattern.test(s) && !groupedPattern.test(s)) {
    if (decimal === "." && /^\d+,\d{1,2}$/.test(s)) {
      return {
        ok: false,
        error: `"${original}" looks like it uses a decimal comma; switch the decimal separator to ","`,
      };
    }
    return { ok: false, error: `"${original}" is not a valid amount` };
  }

  const normalized = s.split(thousands).join("").replace(decimal, ".");
  const [intPart = "", fracPart = ""] = normalized.split(".");
  const warnings: string[] = [];

  if (intPart.replace(/^0+/, "").length > 7) {
    return { ok: false, error: `"${original}" is too large (max ${formatMax()})` };
  }

  let fraction = fracPart;
  let roundUp = false;
  if (fraction.length > 3) {
    roundUp = Number(fraction[3]) >= 5;
    fraction = fraction.slice(0, 3);
    warnings.push(`Rounded ${original} to 3 decimal places`);
  }

  let milliunits = Number(intPart || "0") * 1000 + Number(fraction.padEnd(3, "0"));
  if (roundUp) milliunits += 1;

  if (milliunits > MAX_MILLIUNITS) {
    return { ok: false, error: `"${original}" is too large (max ${formatMax()})` };
  }

  return { ok: true, milliunits: negative && milliunits !== 0 ? -milliunits : milliunits, warnings };
}

const formatMax = () => `${(MAX_MILLIUNITS / 1000).toLocaleString("en-CA")}`;

/**
 * Builds one signed amount from separate debit (money out) and credit (money in)
 * columns. Banks disagree on whether debits are written negative, so the sign
 * in the debit column is ignored: it always reduces the balance.
 */
export function combineDebitCredit(
  debitRaw: string | undefined,
  creditRaw: string | undefined,
  decimal: DecimalSeparator = ".",
): AmountResult {
  const debitText = (debitRaw ?? "").trim();
  const creditText = (creditRaw ?? "").trim();

  if (debitText === "" && creditText === "") {
    return { ok: false, error: "Both debit and credit are empty" };
  }

  const warnings: string[] = [];
  let debit = 0;
  let credit = 0;

  if (debitText !== "") {
    const parsed = parseAmount(debitText, decimal);
    if (!parsed.ok) return { ok: false, error: `Debit: ${parsed.error}` };
    debit = Math.abs(parsed.milliunits);
    warnings.push(...parsed.warnings);
  }

  if (creditText !== "") {
    const parsed = parseAmount(creditText, decimal);
    if (!parsed.ok) return { ok: false, error: `Credit: ${parsed.error}` };
    credit = Math.abs(parsed.milliunits);
    warnings.push(...parsed.warnings);
  }

  if (debit !== 0 && credit !== 0) {
    warnings.push("Both debit and credit have a value; used credit minus debit");
  }

  return { ok: true, milliunits: credit - debit, warnings };
}

/** Guesses the decimal separator from sample amount cells. */
export function detectDecimalSeparator(samples: string[]): DecimalSeparator {
  let comma = 0;
  let dot = 0;
  for (const raw of samples) {
    const s = raw.replace(CURRENCY, "").replace(/[()\s]/g, "").replace(/(DR|CR)$/i, "");
    if (/\d\.\d{3},\d{1,2}-?$/.test(s) || /^-?\d+,\d{1,2}-?$/.test(s)) comma++;
    else if (/\d,\d{3}\.\d{1,2}-?$/.test(s) || /^-?\d+\.\d{1,2}-?$/.test(s)) dot++;
  }
  return comma > dot ? "," : ".";
}

/** True when the value parses as an amount with either separator. */
export function looksLikeAmount(value: string): boolean {
  if (value.trim() === "") return false;
  return parseAmount(value, ".").ok || parseAmount(value, ",").ok;
}

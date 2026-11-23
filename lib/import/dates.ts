import { isDateKey } from "@/lib/dates";
import type { DateFormat } from "@/lib/import/types";

export const DATE_FORMATS: DateFormat[] = [
  "yyyy-MM-dd",
  "MM/dd/yyyy",
  "dd/MM/yyyy",
  "yyyyMMdd",
  "d MMM yyyy",
  "MMM d yyyy",
];

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const monthFromName = (name: string): number | null => {
  const key = name.toLowerCase();
  return MONTHS[key] ?? MONTHS[key.slice(0, 3)] ?? null;
};

// Bank exports often append a time ("2026-01-15 13:45:00", "01/15/2026 1:45 PM",
// "2026-01-15T13:45:00Z"). The calendar date the bank printed is what we keep.
const TIME_SUFFIX =
  /[T\s]+\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?\s*(am|pm)?\s*(z|utc|[+-]\d{2}:?\d{2})?$/i;

const pad = (n: number) => String(n).padStart(2, "0");

const toKey = (y: number, m: number, d: number): string | null => {
  if (y < 1900 || y > 2100) return null;
  const key = `${y}-${pad(m)}-${pad(d)}`;
  return isDateKey(key) ? key : null;
};

const fullYear = (y: string) => (y.length === 2 ? 2000 + Number(y) : Number(y));

/** Why a date failed, so the preview can say something more useful than "invalid". */
export type DateParseResult =
  | { ok: true; date: string }
  | { ok: false; reason: "empty" | "format" | "calendar" };

/**
 * Parses one cell with a given format into a "yyyy-MM-dd" key.
 * "format" means the text doesn't have the expected shape; "calendar" means it
 * has the right shape but isn't a real day (e.g. 2026-02-30).
 */
export function parseDate(raw: string, format: DateFormat): DateParseResult {
  const value = raw.trim().replace(TIME_SUFFIX, "").trim();
  if (value === "") return { ok: false, reason: "empty" };

  let parts: [number, number, number] | null = null; // y, m, d

  switch (format) {
    case "yyyy-MM-dd": {
      const m = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
      if (m) parts = [Number(m[1]), Number(m[2]), Number(m[3])];
      break;
    }
    case "MM/dd/yyyy": {
      const m = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})$/);
      if (m) parts = [fullYear(m[3]), Number(m[1]), Number(m[2])];
      break;
    }
    case "dd/MM/yyyy": {
      const m = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})$/);
      if (m) parts = [fullYear(m[3]), Number(m[2]), Number(m[1])];
      break;
    }
    case "yyyyMMdd": {
      const m = value.match(/^(\d{4})(\d{2})(\d{2})$/);
      if (m) parts = [Number(m[1]), Number(m[2]), Number(m[3])];
      break;
    }
    case "d MMM yyyy": {
      const m = value.match(/^(\d{1,2})[\s\-/]*([a-z]{3,9})\.?[\s\-/,]*(\d{4}|\d{2})$/i);
      const month = m ? monthFromName(m[2]) : null;
      if (m && month) parts = [fullYear(m[3]), month, Number(m[1])];
      break;
    }
    case "MMM d yyyy": {
      const m = value.match(/^([a-z]{3,9})\.?[\s\-/]*(\d{1,2})(?:st|nd|rd|th)?,?[\s\-/]*(\d{4})$/i);
      const month = m ? monthFromName(m[1]) : null;
      if (m && month) parts = [Number(m[3]), month, Number(m[2])];
      break;
    }
  }

  if (!parts) return { ok: false, reason: "format" };

  const key = toKey(...parts);
  return key ? { ok: true, date: key } : { ok: false, reason: "calendar" };
}

export type DateFormatGuess = {
  /** Best format, or null if no format fits most samples. */
  format: DateFormat | null;
  /** True when several formats fit equally well (e.g. 03/04/2026 is MM/DD or DD/MM). */
  ambiguous: boolean;
  /** Every format that fits as well as the chosen one. */
  candidates: DateFormat[];
};

/**
 * Picks the date format that parses the most sample values (at least 80% of the
 * non-empty ones). When MM/DD and DD/MM tie because no day is above 12, MM/DD is
 * chosen (what most North American bank exports use) and the guess is flagged
 * ambiguous so the UI asks the user to confirm.
 */
export function detectDateFormat(samples: string[]): DateFormatGuess {
  const values = samples.map((s) => s.trim()).filter(Boolean);
  if (values.length === 0) return { format: null, ambiguous: false, candidates: [] };

  const scores = DATE_FORMATS.map((format) => ({
    format,
    hits: values.filter((v) => parseDate(v, format).ok).length,
  }));

  const best = Math.max(...scores.map((s) => s.hits));
  if (best === 0 || best / values.length < 0.8) {
    return { format: null, ambiguous: false, candidates: [] };
  }

  const candidates = scores.filter((s) => s.hits === best).map((s) => s.format);
  return { format: candidates[0], ambiguous: candidates.length > 1, candidates };
}

/** True when the value parses as a date in any supported format. */
export function looksLikeDate(value: string): boolean {
  return DATE_FORMATS.some((format) => parseDate(value, format).ok);
}

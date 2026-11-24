import { format, isValid, parse, subDays } from "date-fns";

/**
 * Transactions carry calendar dates, not instants. They travel through the app as
 * "yyyy-MM-dd" strings ("date keys") and are only turned into a Date for display
 * or date-picker widgets, always at local midnight.
 *
 * Never use `new Date("2026-01-15")`: that is UTC midnight, which is still
 * Jan 14 in the Americas.
 */
export const DATE_KEY_FORMAT = "yyyy-MM-dd";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: string): boolean {
  if (!DATE_KEY_RE.test(value)) return false;
  const parsed = parse(value, DATE_KEY_FORMAT, new Date(2000, 0, 1));
  return isValid(parsed) && format(parsed, DATE_KEY_FORMAT) === value;
}

/** Local calendar day of `date` as "yyyy-MM-dd". */
export function toDateKey(date: Date): string {
  return format(date, DATE_KEY_FORMAT);
}

/** "yyyy-MM-dd" to a Date at local midnight (for display and pickers). */
export function fromDateKey(key: string): Date {
  return parse(key, DATE_KEY_FORMAT, new Date(2000, 0, 1));
}

/**
 * Default filter range: the 30 days ending on the user's *local* today. The
 * client always sends it explicitly, so the server's clock (UTC on the edge)
 * never decides which day "today" is.
 */
export function defaultRangeKeys(today: Date = new Date()) {
  return { from: toDateKey(subDays(today, 30)), to: toDateKey(today) };
}

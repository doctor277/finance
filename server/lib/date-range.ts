import { differenceInCalendarDays, subDays } from "date-fns";

import { fromDateKey, isDateKey, toDateKey } from "@/lib/dates";

export type DateRange = {
  /** Inclusive, "yyyy-MM-dd". */
  start: string;
  /** Inclusive, "yyyy-MM-dd". */
  end: string;
};

/**
 * Resolves the `from`/`to` query params into an inclusive range of date keys.
 * Missing values default to the 30 days ending today; a reversed range is swapped.
 */
export function resolveDateRange(
  from: string | undefined,
  to: string | undefined,
  today: Date = new Date(),
): DateRange {
  const end = to && isDateKey(to) ? to : toDateKey(today);
  const start = from && isDateKey(from) ? from : toDateKey(subDays(fromDateKey(end), 30));

  return start <= end ? { start, end } : { start: end, end: start };
}

/** The range of equal length that ends the day before `range` starts. */
export function previousPeriod(range: DateRange): DateRange {
  const days = differenceInCalendarDays(fromDateKey(range.end), fromDateKey(range.start)) + 1;
  return {
    start: toDateKey(subDays(fromDateKey(range.start), days)),
    end: toDateKey(subDays(fromDateKey(range.start), 1)),
  };
}

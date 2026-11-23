import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { eachDayOfInterval, format, subDays } from "date-fns";

import { fromDateKey, toDateKey } from "@/lib/dates";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Milliunits (integer) to dollars for display and charts: 12340 -> 12.34. */
export function fromMilliunits(amount: number) {
  return amount / 1000;
}

/** Dollars to integer milliunits: 12.34 -> 12340. Never returns -0. */
export function toMilliunits(amount: number) {
  return Math.round(amount * 1000) || 0;
}

/**
 * Exact decimal text for milliunits, for CSV exports: no floating point involved.
 * Two decimals unless the value really has a third: -12340 -> "-12.34", 5 -> "0.005".
 */
export function milliunitsToDecimal(milliunits: number): string {
  const sign = milliunits < 0 ? "-" : "";
  const abs = Math.abs(milliunits);
  const whole = Math.floor(abs / 1000);
  const frac = String(abs % 1000).padStart(3, "0");
  return `${sign}${whole}.${frac.endsWith("0") ? frac.slice(0, 2) : frac}`;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Change from `previous` to `current` in percent, or null when there is no
 * baseline (previous is 0): "+100%" from nothing would be misleading.
 */
export function calculatePercentageChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Expands sparse per-day totals into one entry per calendar day of the range,
 * filling the gaps with zeros so charts show a continuous x-axis.
 */
export function fillMissingDays(
  activeDays: { date: string; income: number; expenses: number }[],
  startKey: string,
  endKey: string,
) {
  if (activeDays.length === 0) return [];

  const byDay = new Map(activeDays.map((day) => [day.date, day]));

  return eachDayOfInterval({ start: fromDateKey(startKey), end: fromDateKey(endKey) }).map(
    (day) => {
      const key = toDateKey(day);
      return byDay.get(key) ?? { date: key, income: 0, expenses: 0 };
    },
  );
}

type Period = {
  from: string | Date | undefined;
  to: string | Date | undefined;
};

const asDate = (value: string | Date) =>
  typeof value === "string" ? fromDateKey(value) : value;

export function formatDateRange(period?: Period) {
  const defaultTo = new Date();
  const defaultFrom = subDays(defaultTo, 30);

  if (!period?.from) {
    return `${format(defaultFrom, "LLL dd")} - ${format(defaultTo, "LLL dd, y")}`;
  }

  if (period.to) {
    return `${format(asDate(period.from), "LLL dd")} - ${format(asDate(period.to), "LLL dd, y")}`;
  }

  return format(asDate(period.from), "LLL dd, y");
}

export function formatPercentage(
  value: number,
  options: { addPrefix?: boolean } = { addPrefix: false },
) {
  const result = new Intl.NumberFormat("en-CA", {
    style: "percent",
  }).format(value / 100);

  if (options.addPrefix && value > 0) {
    return `+${result}`;
  }

  return result;
}

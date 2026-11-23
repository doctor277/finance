import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { eachDayOfInterval, format, subDays } from "date-fns";

import { fromDateKey, toDateKey } from "@/lib/dates";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function convertAmountFromMiliunits(amount: number) {
  return amount / 1000;
}

export function convertAmountToMiliunits(amount: number) {
  return Math.round(amount * 1000);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(value);
}

export function calculatePercentageChange(current: number, previous: number) {
  if (previous === 0) {
    return previous === current ? 0 : 100;
  }

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

import { format } from "date-fns";

import { fromDateKey } from "@/lib/dates";
import { formatCurrency, fromMilliunits } from "@/lib/utils";

/** One place for how money and dates look across the app. */
export const money = (milliunits: number) => formatCurrency(fromMilliunits(milliunits));

/** Whole dollars for chart axes: "$1.2k". */
export const compactMoney = (dollars: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(dollars);

export const shortDate = (key: string) => format(fromDateKey(key), "MMM d");
export const longDate = (key: string) => format(fromDateKey(key), "MMM d, yyyy");
export const monthLabel = (month: string) => format(fromDateKey(`${month}-01`), "MMM yyyy");
export const shortMonth = (month: string) => format(fromDateKey(`${month}-01`), "MMM");

export const percent = (share: number) =>
  new Intl.NumberFormat("en-CA", { style: "percent", maximumFractionDigits: share < 0.1 ? 1 : 0 }).format(share);

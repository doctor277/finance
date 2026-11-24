import { describe, expect, test } from "bun:test";

import { fromDateKey, isDateKey, toDateKey } from "@/lib/dates";
import { previousPeriod, resolveDateRange } from "@/server/lib/date-range";
import { fillMissingDays } from "@/lib/utils";

describe("date keys", () => {
  test.each(["2026-01-15", "2024-02-29", "1999-12-31"])("%s is valid", (key) => {
    expect(isDateKey(key)).toBe(true);
  });

  test.each(["2026-02-30", "2025-02-29", "2026-13-01", "2026-1-5", "15/01/2026", "", "2026-01-15T00:00"])(
    "%s is rejected",
    (key) => {
      expect(isDateKey(key)).toBe(false);
    },
  );

  test("round-trips through a local Date without shifting the day", () => {
    for (const key of ["2026-01-01", "2026-03-08", "2026-11-01", "2026-12-31"]) {
      const date = fromDateKey(key);
      expect(date.getHours()).toBe(0);
      expect(toDateKey(date)).toBe(key);
    }
  });
});

describe("resolveDateRange", () => {
  const today = new Date(2026, 10, 23); // 2026-11-23 local

  test("defaults to the 30 days ending today", () => {
    expect(resolveDateRange(undefined, undefined, today)).toEqual({
      start: "2026-10-24",
      end: "2026-11-23",
    });
  });

  test("treats empty strings as unset", () => {
    expect(resolveDateRange("", "", today)).toEqual({ start: "2026-10-24", end: "2026-11-23" });
  });

  test("keeps an explicit range", () => {
    expect(resolveDateRange("2026-01-01", "2026-01-31", today)).toEqual({
      start: "2026-01-01",
      end: "2026-01-31",
    });
  });

  test("swaps a reversed range", () => {
    expect(resolveDateRange("2026-02-01", "2026-01-01", today)).toEqual({
      start: "2026-01-01",
      end: "2026-02-01",
    });
  });
});

describe("previousPeriod", () => {
  test("is the same length and ends the day before", () => {
    expect(previousPeriod({ start: "2026-03-01", end: "2026-03-31" })).toEqual({
      start: "2026-01-29",
      end: "2026-02-28",
    });
  });

  test("works for a single day", () => {
    expect(previousPeriod({ start: "2026-01-01", end: "2026-01-01" })).toEqual({
      start: "2025-12-31",
      end: "2025-12-31",
    });
  });
});

describe("fillMissingDays", () => {
  test("returns one entry per day with zeros for gaps", () => {
    const days = fillMissingDays(
      [{ date: "2026-01-02", income: 100, expenses: 40 }],
      "2026-01-01",
      "2026-01-03",
    );
    expect(days).toEqual([
      { date: "2026-01-01", income: 0, expenses: 0 },
      { date: "2026-01-02", income: 100, expenses: 40 },
      { date: "2026-01-03", income: 0, expenses: 0 },
    ]);
  });

  test("returns nothing when there is no activity", () => {
    expect(fillMissingDays([], "2026-01-01", "2026-01-03")).toEqual([]);
  });
});

describe("client default range", () => {
  test("is the 30 days ending on the browser's local today", async () => {
    const { defaultRangeKeys } = await import("@/lib/dates");
    expect(defaultRangeKeys(new Date(2026, 10, 23, 23, 30))).toEqual({ from: "2026-10-24", to: "2026-11-23" });
  });
});

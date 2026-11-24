"use client";

import { useState } from "react";
import qs from "query-string";
import { startOfMonth, startOfYear, subDays, subMonths } from "date-fns";
import { CalendarDays, ChevronDown } from "lucide-react";
import { DateRange } from "react-day-picker";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMedia } from "react-use";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateRange } from "@/lib/utils";
import { fromDateKey, toDateKey } from "@/lib/dates";

const presets = (today: Date) => [
  { label: "Last 30 days", from: subDays(today, 30), to: today },
  { label: "This month", from: startOfMonth(today), to: today },
  { label: "Last 3 months", from: startOfMonth(subMonths(today, 2)), to: today },
  { label: "This year", from: startOfYear(today), to: today },
];

export const DateFilter = () => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const wide = useMedia("(min-width: 768px)", true);

  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const today = new Date();

  const current = {
    from: from ? fromDateKey(from) : subDays(today, 30),
    to: to ? fromDateKey(to) : today,
  };

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<DateRange | undefined>(current);

  const apply = (range: { from?: Date; to?: Date } | undefined) => {
    const url = qs.stringifyUrl(
      {
        url: pathname,
        query: {
          from: range?.from ? toDateKey(range.from) : "",
          to: range?.to ? toDateKey(range.to) : "",
          accountId: params.get("accountId") || "",
        },
      },
      { skipEmptyString: true, skipNull: true },
    );
    router.push(url);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDate(current);
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 w-full justify-between bg-card font-normal sm:w-auto sm:min-w-56">
          <span className="flex items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
            <span className="sr-only">Date range: </span>
            {formatDateRange(current)}
          </span>
          <ChevronDown className="size-4 opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col md:flex-row">
          <ul className="flex flex-wrap gap-1 border-b p-2 md:w-40 md:flex-col md:border-b-0 md:border-r">
            {presets(today).map((preset) => (
              <li key={preset.label}>
                <button
                  type="button"
                  onClick={() => apply(preset)}
                  className="w-full rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {preset.label}
                </button>
              </li>
            ))}
          </ul>
          <div>
            <Calendar
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={wide ? 2 : 1}
              autoFocus
            />
            <div className="flex gap-2 border-t p-3">
              <Button variant="outline" className="flex-1" onClick={() => apply(undefined)}>
                Reset
              </Button>
              <Button className="flex-1" disabled={!date?.from || !date?.to} onClick={() => apply(date)}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

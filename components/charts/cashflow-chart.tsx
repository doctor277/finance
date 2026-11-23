"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { compactMoney, longDate, money, monthLabel, shortDate, shortMonth } from "@/lib/format";
import { toMilliunits } from "@/lib/utils";

/** Values in dollars (already converted from milliunits). */
type Point = { key: string; income: number; spending: number };

const SERIES = [
  { key: "income", label: "Income", color: "var(--chart-income)" },
  { key: "spending", label: "Spending", color: "var(--chart-spending)" },
] as const;

type Props = {
  data: Point[];
  /** "day" draws lines over time; "month" draws grouped bars per month. */
  granularity: "day" | "month";
  height?: number;
};

const label = (key: string, granularity: Props["granularity"]) =>
  granularity === "day" ? longDate(key) : monthLabel(key);

/**
 * Income vs spending. Two series in the validated blue/orange pair, a legend,
 * a hover tooltip, recessive axes, and the same numbers as a table below.
 */
export const CashflowChart = ({ data, granularity, height = 280 }: Props) => {
  const tick = granularity === "day" ? shortDate : shortMonth;
  const axis = { stroke: "var(--muted-foreground)", fontSize: 12, tickLine: false, axisLine: false } as const;

  const common = (
    <>
      <CartesianGrid vertical={false} stroke="var(--border)" />
      <XAxis dataKey="key" tickFormatter={tick} {...axis} minTickGap={24} tickMargin={8} />
      <YAxis tickFormatter={compactMoney} {...axis} width={56} />
      <Tooltip
        cursor={granularity === "day" ? { stroke: "var(--muted-foreground)", strokeWidth: 1 } : { fill: "var(--muted)" }}
        content={({ active, payload, label: key }) =>
          active && payload?.length ? (
            <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
              <p className="mb-1 font-medium">{label(String(key), granularity)}</p>
              {SERIES.map((s) => {
                const value = Number(payload.find((p) => p.dataKey === s.key)?.value ?? 0);
                return (
                  <p key={s.key} className="flex items-center justify-between gap-6">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
                      {s.label}
                    </span>
                    <span className="tabular">{money(toMilliunits(value))}</span>
                  </p>
                );
              })}
            </div>
          ) : null
        }
      />
    </>
  );

  return (
    <figure className="space-y-3">
      <ul className="flex gap-4 text-sm" aria-label="Legend">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="h-0.5 w-4 rounded" style={{ background: s.color, height: granularity === "day" ? 2 : 10, width: granularity === "day" ? 16 : 10 }} aria-hidden />
            {s.label}
          </li>
        ))}
      </ul>

      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height }}>
          {granularity === "day" ? (
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              {common}
              {SERIES.map((s) => (
                <Line
                  key={s.key}
                  type="linear"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
              {common}
              {SERIES.map((s) => (
                <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show the numbers as a table</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <caption className="sr-only">Income and spending by {granularity}</caption>
            <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">{granularity === "day" ? "Day" : "Month"}</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Income</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Spending</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {data.map((d) => (
                <tr key={d.key} className="border-t">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal">{label(d.key, granularity)}</th>
                  <td className="px-3 py-1.5 text-right">{money(toMilliunits(d.income))}</td>
                  <td className="px-3 py-1.5 text-right">{money(toMilliunits(d.spending))}</td>
                  <td className="px-3 py-1.5 text-right">{money(toMilliunits(d.income - d.spending))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
};

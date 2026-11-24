"use client";

import Link from "next/link";
import { BarChart3, Download, FileUp, PieChart, Users } from "lucide-react";

import { useExportUrl, useGetReport } from "@/features/reports/api/use-get-report";
import { CashflowChart } from "@/components/charts/cashflow-chart";
import { CategoryBars } from "@/components/charts/category-bars";
import { PageHeader } from "@/components/shell/page-header";
import { Panel } from "@/components/panel";
import { StatStrip, StatStripSkeleton } from "@/components/stat-strip";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { longDate, money } from "@/lib/format";
import { fromMilliunits } from "@/lib/utils";

export const ReportsView = () => {
  const { data, isLoading, isError, refetch } = useGetReport();
  const exportUrl = useExportUrl();

  const header = (
    <PageHeader
      title="Reports"
      description={
        data
          ? `${longDate(data.range.start)} to ${longDate(data.range.end)}`
          : "Spending by category, income vs spending, and who you pay most"
      }
      filters
      actions={
        <Button asChild variant="outline" size="sm" className="h-9">
          {/* Same-origin download: the browser sends the session cookie. */}
          <a href={exportUrl} download>
            <Download className="size-4" aria-hidden /> Export CSV
          </a>
        </Button>
      }
    />
  );

  if (isError) {
    return (
      <>
        {header}
        <Panel title="Report">
          <ErrorState message="The report couldn't be loaded." onRetry={() => refetch()} />
        </Panel>
      </>
    );
  }

  if (isLoading || !data) {
    return (
      <>
        {header}
        <div className="space-y-6" aria-busy="true">
          <StatStripSkeleton count={4} />
          <Skeleton className="h-96" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        </div>
      </>
    );
  }

  if (data.totals.count === 0) {
    return (
      <>
        {header}
        <section className="rounded-lg border bg-card">
          <EmptyState
            icon={BarChart3}
            title="No transactions in this period"
            description="Choose a wider date range or another account above, or import a bank statement for these dates."
            action={
              <Button asChild variant="outline">
                <Link href="/import">
                  <FileUp className="size-4" aria-hidden /> Import a CSV
                </Link>
              </Button>
            }
          />
        </section>
      </>
    );
  }

  const months = data.months.map((m) => ({
    key: m.month,
    income: fromMilliunits(m.income),
    spending: fromMilliunits(m.expenses),
  }));

  return (
    <>
      {header}
      <div className="space-y-6">
        <StatStrip
          stats={[
            { label: "Income", value: data.totals.income },
            { label: "Spending", value: data.totals.expenses },
            { label: "Net", value: data.totals.net },
            { label: "Transactions", value: data.totals.count, isCount: true },
          ]}
        />

        <Panel title="Income vs spending" description="Per month, for the selected period">
          <CashflowChart data={months} granularity="month" height={300} />
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Spending by category" description="Share of all spending in the period">
            {data.categories.length === 0 ? (
              <EmptyState icon={PieChart} title="No spending" description="Only income in this period." className="py-10" />
            ) : (
              <CategoryBars items={data.categories} />
            )}
          </Panel>

          <Panel title="Top payees" description="Ranked by money spent">
            {data.payees.length === 0 ? (
              <EmptyState icon={Users} title="No payees" description="No transactions in this period." className="py-10" />
            ) : (
              <div className="-mx-5 -my-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Top payees by money spent</caption>
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th scope="col" className="px-5 py-2.5 font-medium">Payee</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Count</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Spent</th>
                      <th scope="col" className="px-5 py-2.5 text-right font-medium">Received</th>
                    </tr>
                  </thead>
                  <tbody className="tabular">
                    {data.payees.map((p) => (
                      <tr key={p.payee} className="border-b last:border-0">
                        <th scope="row" className="max-w-48 truncate px-5 py-2.5 text-left font-normal" title={p.payee}>
                          {p.payee}
                          <span className="block text-xs text-muted-foreground">Last {longDate(p.lastDate)}</span>
                        </th>
                        <td className="px-3 py-2.5 text-right">{p.count}</td>
                        <td className="px-3 py-2.5 text-right">{p.spent ? money(p.spent) : "–"}</td>
                        <td className="px-5 py-2.5 text-right">{p.received ? money(p.received) : "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
};

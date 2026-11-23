"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileUp, PieChart, Plus } from "lucide-react";

import { useGetSummary } from "@/features/summary/api/use-get-summary";
import { useNewTransaction } from "@/features/transactions/hooks/use-new-transaction";
import { CashflowChart } from "@/components/charts/cashflow-chart";
import { CategoryBars } from "@/components/charts/category-bars";
import { PageHeader } from "@/components/shell/page-header";
import { Panel } from "@/components/panel";
import { StatStrip, StatStripSkeleton } from "@/components/stat-strip";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fromMilliunits } from "@/lib/utils";
import { longDate } from "@/lib/format";

export default function OverviewPage() {
  return (
    <Suspense fallback={null}>
      <Overview />
    </Suspense>
  );
}

function Overview() {
  const params = useSearchParams();
  const { data, isLoading, isError, refetch } = useGetSummary();
  const newTransaction = useNewTransaction();
  const query = params.toString();

  const header = (
    <PageHeader
      title="Overview"
      description={data ? `${longDate(data.range.start)} to ${longDate(data.range.end)}` : "Income and spending for the selected period"}
      filters={data?.hasTransactions !== false}
    />
  );

  if (isError) {
    return (
      <>
        {header}
        <Panel title="Overview">
          <ErrorState message="The overview couldn't be loaded." onRetry={() => refetch()} />
        </Panel>
      </>
    );
  }

  if (isLoading || !data) {
    return (
      <>
        {header}
        <div className="space-y-6" aria-busy="true">
          <StatStripSkeleton />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-80 lg:col-span-2" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </>
    );
  }

  if (!data.hasTransactions) {
    return (
      <>
        {header}
        <section className="rounded-lg border bg-card">
          <EmptyState
            icon={FileUp}
            title="Import your first bank CSV"
            description="Export transactions from your bank's website as CSV and drop the file in. You'll map the columns and review every row before anything is saved."
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild>
                  <Link href="/import">
                    <FileUp className="size-4" aria-hidden /> Import a CSV
                  </Link>
                </Button>
                <Button variant="outline" onClick={newTransaction.onOpen}>
                  <Plus className="size-4" aria-hidden /> Add a transaction by hand
                </Button>
              </div>
            }
          />
        </section>
      </>
    );
  }

  const days = data.days.map((d) => ({
    key: d.date,
    income: fromMilliunits(d.income),
    spending: fromMilliunits(d.expenses),
  }));
  const total = data.categories.reduce((s, c) => s + c.value, 0);
  const categories = data.categories.map((c) => ({ name: c.name, spent: c.value, share: total ? c.value / total : 0 }));

  return (
    <>
      {header}
      <div className="space-y-6">
        <StatStrip
          stats={[
            { label: "Net", value: data.remainingAmount, change: data.remainingChange },
            { label: "Income", value: data.incomeAmount, change: data.incomeChange },
            { label: "Spending", value: data.expensesAmount, change: data.expensesChange, upIsGood: false },
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title="Cash flow" description="Income and spending per day" className="lg:col-span-2">
            {days.length === 0 ? (
              <EmptyState
                icon={FileUp}
                title="No transactions in this period"
                description="Pick a wider date range above, or import a statement that covers these dates."
                className="py-10"
              />
            ) : (
              <CashflowChart data={days} granularity="day" />
            )}
          </Panel>

          <Panel
            title="Where it went"
            description="Spending by category"
            action={
              <Link href={`/reports${query ? `?${query}` : ""}`} className="text-sm text-primary underline-offset-4 hover:underline">
                Full report
              </Link>
            }
          >
            {categories.length === 0 ? (
              <EmptyState icon={PieChart} title="No spending" description="Nothing was spent in this period." className="py-10" />
            ) : (
              <CategoryBars items={categories} />
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

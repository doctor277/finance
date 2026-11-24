"use client";

import { Suspense } from "react";
import Link from "next/link";
import { FileUp, Plus } from "lucide-react";

import { useNewTransaction } from "@/features/transactions/hooks/use-new-transaction";
import { useGetTransactions } from "@/features/transactions/api/use-get-transactions";
import { useBulkDeleteTransactions } from "@/features/transactions/api/use-bulk-delete-transactions";

import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";

import { columns } from "./columns";

// Suspense boundary for useSearchParams() in the hooks below.
export default function TransactionsPage() {
  return (
    <Suspense fallback={null}>
      <Transactions />
    </Suspense>
  );
}

function Transactions() {
  const newTransaction = useNewTransaction();
  const deleteTransactions = useBulkDeleteTransactions();
  const query = useGetTransactions();

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Everything in the selected period. Click a category or account to edit it."
        filters
        actions={
          <>
            <Button asChild size="sm" variant="outline" className="h-9">
              <Link href="/import">
                <FileUp className="size-4" aria-hidden /> Import CSV
              </Link>
            </Button>
            <Button size="sm" className="h-9" onClick={newTransaction.onOpen}>
              <Plus className="size-4" aria-hidden /> Add transaction
            </Button>
          </>
        }
      />
      <section className="rounded-lg border bg-card p-5">
        {query.isError ? (
          <ErrorState message="Your transactions couldn't be loaded." onRetry={() => query.refetch()} />
        ) : (
          <DataTable
            filterKey="payee"
            filterLabel="Search payees"
            noun="transaction"
            columns={columns}
            data={query.data ?? []}
            loading={query.isLoading}
            onDelete={(rows) => deleteTransactions.mutate({ ids: rows.map((r) => r.original.id) })}
            disabled={query.isLoading || deleteTransactions.isPending}
            emptyState={
              <EmptyState
                icon={FileUp}
                title="No transactions in this period"
                description="Import a bank CSV, add one by hand, or widen the date range above."
                action={
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button asChild>
                      <Link href="/import">
                        <FileUp className="size-4" aria-hidden /> Import a CSV
                      </Link>
                    </Button>
                    <Button variant="outline" onClick={newTransaction.onOpen}>
                      <Plus className="size-4" aria-hidden /> Add transaction
                    </Button>
                  </div>
                }
              />
            }
          />
        )}
      </section>
    </>
  );
}

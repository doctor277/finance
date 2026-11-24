"use client";

import { Plus, Landmark } from "lucide-react";

import { useNewAccount } from "@/features/accounts/hooks/use-new-account";
import { useGetAccounts } from "@/features/accounts/api/use-get-accounts";
import { useBulkDeleteAccounts } from "@/features/accounts/api/use-bulk-delete-accounts";

import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";

import { columns } from "./columns";

export default function AccountsPage() {
  const newItem = useNewAccount();
  const deleteItems = useBulkDeleteAccounts();
  const query = useGetAccounts();

  return (
    <>
      <PageHeader
        title="Accounts"
        description="Bank accounts and cards. Every transaction, imported or typed in, belongs to one."
        actions={
          <Button size="sm" className="h-9" onClick={newItem.onOpen}>
            <Plus className="size-4" aria-hidden /> Add account
          </Button>
        }
      />
      <section className="rounded-lg border bg-card p-5">
        {query.isError ? (
          <ErrorState message="Your accounts couldn't be loaded." onRetry={() => query.refetch()} />
        ) : (
          <DataTable
            filterKey="name"
            filterLabel="Search accounts"
            noun="account"
            columns={columns}
            data={query.data ?? []}
            loading={query.isLoading}
            onDelete={(rows) => deleteItems.mutate({ ids: rows.map((r) => r.original.id) })}
            disabled={query.isLoading || deleteItems.isPending}
            emptyState={
              <EmptyState
                icon={Landmark}
                title="No accounts yet"
                description="Add the bank accounts or cards you track, for example Chequing or Visa. You can also create one while importing a CSV."
                action={
                  <Button onClick={newItem.onOpen}>
                    <Plus className="size-4" aria-hidden /> Add account
                  </Button>
                }
              />
            }
          />
        )}
      </section>
    </>
  );
}

"use client";

import { Plus, Tags } from "lucide-react";

import { useNewCategory } from "@/features/categories/hooks/use-new-category";
import { useGetCategories } from "@/features/categories/api/use-get-categories";
import { useBulkDeleteCategories } from "@/features/categories/api/use-bulk-delete-categories";

import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";

import { columns } from "./columns";

export default function CategoriesPage() {
  const newItem = useNewCategory();
  const deleteItems = useBulkDeleteCategories();
  const query = useGetCategories();

  return (
    <>
      <PageHeader
        title="Categories"
        description="Groups for your spending, used by the reports."
        actions={
          <Button size="sm" className="h-9" onClick={newItem.onOpen}>
            <Plus className="size-4" aria-hidden /> Add category
          </Button>
        }
      />
      <section className="rounded-lg border bg-card p-5">
        {query.isError ? (
          <ErrorState message="Your categories couldn't be loaded." onRetry={() => query.refetch()} />
        ) : (
          <DataTable
            filterKey="name"
            filterLabel="Search categories"
            noun="category"
            nounPlural="categories"
            columns={columns}
            data={query.data ?? []}
            loading={query.isLoading}
            onDelete={(rows) => deleteItems.mutate({ ids: rows.map((r) => r.original.id) })}
            disabled={query.isLoading || deleteItems.isPending}
            emptyState={
              <EmptyState
                icon={Tags}
                title="No categories yet"
                description="Add categories like Groceries or Rent, then assign them to transactions to see where your money goes."
                action={
                  <Button onClick={newItem.onOpen}>
                    <Plus className="size-4" aria-hidden /> Add category
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

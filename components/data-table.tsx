"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  Row,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Search, Trash } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/hooks/use-confirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterKey: string;
  /** e.g. "Search payees" */
  filterLabel: string;
  /** Singular noun for messages, e.g. "transaction". */
  noun: string;
  onDelete: (rows: Row<TData>[]) => void;
  disabled?: boolean;
  loading?: boolean;
  /** Shown when there is no data at all (not when a search matches nothing). */
  emptyState?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterKey,
  filterLabel,
  noun,
  onDelete,
  disabled,
  loading,
  emptyState,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, rowSelection },
    initialState: { pagination: { pageSize: 20 } },
  });

  const selected = table.getFilteredSelectedRowModel().rows;
  const plural = (n: number) => `${n} ${noun}${n === 1 ? "" : "s"}`;

  const [ConfirmDialog, confirm] = useConfirm(
    `Delete ${plural(selected.length)}?`,
    "This can't be undone.",
  );

  if (!loading && data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div>
      <ConfirmDialog />
      <div className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            aria-label={filterLabel}
            placeholder={`${filterLabel}…`}
            value={(table.getColumn(filterKey)?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn(filterKey)?.setFilterValue(event.target.value)}
            className="pl-8"
            disabled={loading}
          />
        </div>
        {selected.length > 0 && (
          <Button
            disabled={disabled}
            size="sm"
            variant="outline"
            className="sm:ml-auto"
            onClick={async () => {
              if (await confirm()) {
                onDelete(selected);
                table.resetRowSelection();
              }
            }}
          >
            <Trash className="size-4" aria-hidden />
            Delete {plural(selected.length)}
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-xs font-medium text-muted-foreground">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={columns.length}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No {noun}s match your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          {selected.length > 0
            ? `${selected.length} of ${table.getFilteredRowModel().rows.length} selected`
            : plural(table.getFilteredRowModel().rows.length)}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
          </span>
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

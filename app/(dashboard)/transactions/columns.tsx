"use client";

import { InferResponseType } from "hono";
import { ArrowUpDown } from "lucide-react";
import { Column, ColumnDef } from "@tanstack/react-table";

import { client } from "@/lib/hono";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatCurrency } from "@/lib/utils";
import { longDate } from "@/lib/format";
import { Actions } from "./actions";
import { AccountCell, CategoryCell } from "./linked-cells";

export type ResponseType = InferResponseType<typeof client.api.transactions.$get, 200>["data"][0];

function SortHeader<T>({ column, label, align }: { column: Column<T>; label: string; align?: "right" }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-mx-2 h-8 text-xs font-medium text-muted-foreground", align === "right" && "ml-auto flex")}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      <ArrowUpDown className="size-3.5" aria-hidden />
    </Button>
  );
}

export const columns: ColumnDef<ResponseType>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all on this page"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={`Select ${row.original.payee} on ${longDate(row.original.date)}`}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "date",
    header: ({ column }) => <SortHeader column={column} label="Date" />,
    cell: ({ row }) => <span className="whitespace-nowrap tabular">{longDate(row.original.date)}</span>,
  },
  {
    accessorKey: "payee",
    header: ({ column }) => <SortHeader column={column} label="Payee" />,
    cell: ({ row }) => (
      <span className="block max-w-64 truncate" title={row.original.notes ?? undefined}>
        {row.original.payee}
      </span>
    ),
  },
  {
    accessorKey: "category",
    header: ({ column }) => <SortHeader column={column} label="Category" />,
    cell: ({ row }) => (
      <CategoryCell id={row.original.id} category={row.original.category} categoryId={row.original.categoryId} />
    ),
  },
  {
    accessorKey: "account",
    header: ({ column }) => <SortHeader column={column} label="Account" />,
    cell: ({ row }) => <AccountCell account={row.original.account} accountId={row.original.accountId} />,
  },
  {
    accessorKey: "amount",
    header: ({ column }) => <SortHeader column={column} label="Amount" align="right" />,
    cell: ({ row }) => {
      const amount = row.original.amount;
      return (
        <span className={cn("block whitespace-nowrap text-right tabular", amount > 0 && "text-success")}>
          {amount > 0 ? "+" : ""}
          {formatCurrency(amount)}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <Actions id={row.original.id} />,
  },
];

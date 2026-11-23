"use client";

import { InferResponseType } from "hono";
import { ColumnDef } from "@tanstack/react-table";

import { client } from "@/lib/hono";
import { SortHeader } from "@/components/sort-header";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatCurrency } from "@/lib/utils";
import { longDate } from "@/lib/format";
import { Actions } from "./actions";
import { AccountCell, CategoryCell } from "./linked-cells";

export type ResponseType = InferResponseType<typeof client.api.transactions.$get, 200>["data"][0];

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

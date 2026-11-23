"use client";

import { ArrowUpDown } from "lucide-react";
import { Column } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Column header that toggles sorting; aligned with the cell text below it. */
export function SortHeader<T>({ column, label, align }: { column: Column<T>; label: string; align?: "right" }) {
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

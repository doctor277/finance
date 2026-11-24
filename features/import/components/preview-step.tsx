"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, fromMilliunits, formatCurrency } from "@/lib/utils";
import { fromDateKey } from "@/lib/dates";
import type { ParsedRow, RowStatus } from "@/lib/import";
import { StatusBadge } from "./status-badge";

type Filter = "all" | RowStatus;

const PAGE_SIZE = 50;

type Props = {
  rows: ParsedRow[];
  included: Set<number>;
  onToggle: (line: number, include: boolean) => void;
  onToggleDuplicates: (include: boolean) => void;
  onBack: () => void;
  onImport: () => void;
  busy: boolean;
  duplicateCheckFailed: boolean;
};

/** Rows that can be imported at all; errors never can. */
export const isImportable = (row: ParsedRow) => row.status !== "error";

export const PreviewStep = ({
  rows,
  included,
  onToggle,
  onToggleDuplicates,
  onBack,
  onImport,
  busy,
  duplicateCheckFailed,
}: Props) => {
  const [filter, setFilter] = useState<Filter>(() =>
    rows.some((r) => r.status === "error") ? "error" : "all",
  );
  const [page, setPage] = useState(0);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: rows.length, valid: 0, warning: 0, error: 0, duplicate: 0 };
    for (const row of rows) c[row.status]++;
    return c;
  }, [rows]);

  const visible = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageRows = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const duplicates = rows.filter((r) => r.status === "duplicate");
  const duplicatesIncluded = duplicates.filter((r) => included.has(r.line)).length;
  const toImport = rows.filter((r) => isImportable(r) && included.has(r.line)).length;

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All rows" },
    { key: "valid", label: "Valid" },
    { key: "warning", label: "Warnings" },
    { key: "error", label: "Errors" },
    { key: "duplicate", label: "Duplicates" },
  ];

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["Valid", counts.valid, "text-success"],
            ["Warnings", counts.warning, "text-warning"],
            ["Errors (won't import)", counts.error, "text-destructive"],
            ["Already in account", counts.duplicate, "text-muted-foreground"],
          ] as const
        ).map(([label, value, color]) => (
          <div key={label} className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className={cn("text-2xl font-semibold tabular-nums", color)}>{value.toLocaleString()}</dd>
          </div>
        ))}
      </dl>

      {duplicateCheckFailed && (
        <p role="alert" className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
          Couldn&apos;t check this account for duplicates. You can still import, but rows that already exist
          won&apos;t be flagged.
        </p>
      )}

      {duplicates.length > 0 && (
        <label className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <Checkbox
            checked={duplicatesIncluded === 0}
            onCheckedChange={(checked) => onToggleDuplicates(!checked)}
            aria-describedby="dup-help"
          />
          <span>
            Skip the {duplicates.length} row{duplicates.length === 1 ? "" : "s"} already in this account
            <span id="dup-help" className="block text-xs text-muted-foreground">
              Same date, amount and payee as an existing transaction. Untick to import them anyway.
            </span>
          </span>
        </label>
      )}

      <div role="tablist" aria-label="Filter rows by status" className="flex flex-wrap gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            type="button"
            aria-selected={filter === tab.key}
            onClick={() => {
              setFilter(tab.key);
              setPage(0);
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60",
              filter === tab.key
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            {tab.label} <span className="tabular-nums opacity-80">({counts[tab.key]})</span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">Parsed rows with their validation status</caption>
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="w-10 p-2"><span className="sr-only">Import</span></th>
              <th scope="col" className="p-2 font-medium">Line</th>
              <th scope="col" className="p-2 font-medium">Status</th>
              <th scope="col" className="p-2 font-medium">Date</th>
              <th scope="col" className="p-2 font-medium">Payee</th>
              <th scope="col" className="p-2 text-right font-medium">Amount</th>
              <th scope="col" className="p-2 font-medium">Why</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No rows with this status.
                </td>
              </tr>
            )}
            {pageRows.map((row) => (
              <tr
                key={row.line}
                className={cn(
                  "border-t align-top",
                  row.status === "error" && "bg-destructive/[0.03]",
                  !included.has(row.line) && row.status !== "error" && "text-muted-foreground",
                )}
              >
                <td className="p-2">
                  <Checkbox
                    checked={isImportable(row) && included.has(row.line)}
                    disabled={!isImportable(row) || busy}
                    onCheckedChange={(checked) => onToggle(row.line, checked === true)}
                    aria-label={`Import line ${row.line}`}
                  />
                </td>
                <td className="p-2 font-mono text-xs tabular-nums text-muted-foreground">{row.line}</td>
                <td className="p-2"><StatusBadge status={row.status} /></td>
                <td className="whitespace-nowrap p-2 tabular-nums">
                  {row.date ? format(fromDateKey(row.date), "MMM d, yyyy") : <span className="text-muted-foreground">–</span>}
                </td>
                <td className="max-w-64 truncate p-2" title={row.payee ?? undefined}>
                  {row.payee ?? <span className="text-muted-foreground">(none)</span>}
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap p-2 text-right tabular-nums",
                    row.amount !== null && row.amount < 0 && "text-foreground",
                    row.amount !== null && row.amount > 0 && "text-success",
                  )}
                >
                  {row.amount !== null ? formatCurrency(fromMilliunits(row.amount)) : "–"}
                </td>
                <td className="p-2 text-xs">
                  {row.status === "duplicate" && <p>Already in this account</p>}
                  <ul className="space-y-0.5">
                    {row.issues.map((issue, i) => (
                      <li key={i} className={issue.severity === "error" ? "text-destructive" : "text-warning"}>
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">
            Page {page + 1} of {pageCount}
          </span>
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button size="sm" variant="outline" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" onClick={onBack} disabled={busy}>
          <ArrowLeft className="size-4" aria-hidden /> Back to column mapping
        </Button>
        <Button onClick={onImport} disabled={toImport === 0 || busy}>
          <Upload className="size-4" aria-hidden />
          {busy ? "Importing…" : `Import ${toImport.toLocaleString()} transaction${toImport === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
};


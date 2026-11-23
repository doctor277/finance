"use client";

import Link from "next/link";
import { CheckCircle2, Download, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export type ImportResult = {
  imported: number;
  duplicatesSkipped: number;
  rejected: number;
  excluded: number;
  accountName: string;
  skippedCsv: string | null;
};

type Props = {
  result: ImportResult;
  onDownload: () => void;
  onImportAnother: () => void;
};

export const ResultStep = ({ result, onDownload, onImportAnother }: Props) => {
  const notImported = result.duplicatesSkipped + result.rejected + result.excluded;

  return (
    <div className="space-y-6" aria-live="polite">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-success" aria-hidden />
        <div>
          <h3 className="text-lg font-semibold">Import complete</h3>
          <p className="text-sm text-muted-foreground">
            {result.imported.toLocaleString()} imported, {result.duplicatesSkipped.toLocaleString()} skipped as
            duplicates, {result.rejected.toLocaleString()} rejected
            {result.excluded > 0 && `, ${result.excluded.toLocaleString()} left out by you`}. Account:{" "}
            {result.accountName}.
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Imported" value={result.imported} className="text-success" />
        <Stat label="Skipped as duplicates" value={result.duplicatesSkipped} className="text-muted-foreground" />
        <Stat label="Rejected" value={result.rejected} className="text-destructive" />
      </dl>

      {notImported > 0 && result.skippedCsv && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium">Fix the rows that didn&apos;t make it</p>
          <p className="mb-3 text-sm text-muted-foreground">
            The file lists every row that wasn&apos;t imported, its line number in your original file and the
            reason, followed by the original columns. Correct them in a spreadsheet and import that file.
          </p>
          <Button variant="outline" onClick={onDownload}>
            <Download className="size-4" aria-hidden /> Download {notImported} skipped row{notImported === 1 ? "" : "s"} (CSV)
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild>
          <Link href="/transactions">View transactions</Link>
        </Button>
        <Button variant="outline" onClick={onImportAnother}>
          <RotateCcw className="size-4" aria-hidden /> Import another file
        </Button>
      </div>
    </div>
  );
};

const Stat = ({ label, value, className }: { label: string; value: number; className: string }) => (
  <div className="rounded-lg border p-4">
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className={`text-3xl font-semibold tabular-nums ${className}`}>{value.toLocaleString()}</dd>
  </div>
);

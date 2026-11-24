"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";

import { cn } from "@/lib/utils";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

const SAMPLES = [
  { file: "05-messy-bank-export.csv", label: "Messy export (errors, duplicates, preamble)" },
  { file: "02-chequing-two-description-columns.csv", label: "Chequing export (M/D/YYYY, CAD$)" },
  { file: "03-no-header-debit-credit.csv", label: "No header, debit/credit columns" },
  { file: "04-semicolon-decimal-comma.csv", label: "Semicolons and decimal commas" },
];

type Props = {
  onFile: (file: File) => void;
  error?: string | null;
  busy?: boolean;
};

export const UploadStep = ({ onFile, error, busy }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <label
        htmlFor="csv-file"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files);
        }}
        className={cn(
          "group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors",
          "has-[:focus-visible]:ring-ring/60 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:border-ring",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-muted/50",
          busy && "pointer-events-none opacity-60",
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="size-5" aria-hidden />
        </span>
        <span className="text-base font-medium">
          Drop a bank CSV here, or <span className="text-primary underline underline-offset-4">choose a file</span>
        </span>
        <span className="max-w-md text-sm text-muted-foreground">
          Any bank export works: you map the columns in the next step. Up to 5,000 rows and 5 MB.
          Nothing is saved until you confirm the import.
        </span>
        <input
          ref={inputRef}
          id="csv-file"
          type="file"
          accept=".csv,.txt,text/csv"
          className="sr-only"
          disabled={busy}
          onChange={(e) => pick(e.target.files)}
        />
      </label>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium">No bank file handy?</p>
        <p className="mb-3 text-sm text-muted-foreground">
          Download a sample export, then drop it above. The messy one shows every validation rule.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {SAMPLES.map((sample) => (
            <li key={sample.file}>
              <a
                href={`/samples/${sample.file}`}
                download
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60"
              >
                <FileSpreadsheet className="size-4 shrink-0" aria-hidden />
                {sample.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

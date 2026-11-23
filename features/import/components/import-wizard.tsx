"use client";

import { useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { downloadTextFile } from "@/lib/download";
import {
  MAX_IMPORT_ROWS,
  analyzeCsv,
  applyDuplicates,
  buildSkippedRowsCsv,
  detectFormats,
  reasonFor,
  validateRows,
  type ColumnMapping,
  type DateFormat,
  type DecimalSeparator,
  type ParsedFile,
  type ParsedRow,
} from "@/lib/import";
import { useGetAccounts } from "@/features/accounts/api/use-get-accounts";
import { useCreateAccount } from "@/features/accounts/api/use-create-account";
import { useBulkCreateTransactions } from "@/features/transactions/api/use-bulk-create-transactions";
import { useCheckDuplicates } from "@/features/import/api/use-check-duplicates";

import { MAX_FILE_BYTES, UploadStep } from "./upload-step";
import { MappingStep } from "./mapping-step";
import { PreviewStep, isImportable } from "./preview-step";
import { ResultStep, type ImportResult } from "./result-step";

type Step = "upload" | "map" | "preview" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "map", label: "Map columns" },
  { key: "preview", label: "Review" },
  { key: "done", label: "Done" },
];

type Loaded = {
  fileName: string;
  file: ParsedFile;
  autoMapping: ColumnMapping;
};

export const ImportWizard = () => {
  const [step, setStep] = useState<Step>("upload");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [dateFormat, setDateFormat] = useState<DateFormat | null>(null);
  const [dateAmbiguous, setDateAmbiguous] = useState(false);
  const [decimalSeparator, setDecimalSeparator] = useState<DecimalSeparator>(".");
  const [accountId, setAccountId] = useState<string | null>(null);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [included, setIncluded] = useState<Set<number>>(new Set());
  const [duplicateCheckFailed, setDuplicateCheckFailed] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const accountsQuery = useGetAccounts();
  const createAccount = useCreateAccount();
  const checkDuplicates = useCheckDuplicates();
  const bulkCreate = useBulkCreateTransactions();

  const accountOptions = (accountsQuery.data ?? []).map((a) => ({ label: a.name, value: a.id }));
  const accountName = accountOptions.find((a) => a.value === accountId)?.label ?? "";

  const reset = () => {
    setStep("upload");
    setLoaded(null);
    setRows([]);
    setIncluded(new Set());
    setResult(null);
    setUploadError(null);
    setDuplicateCheckFailed(false);
  };

  const onFile = async (file: File) => {
    setUploadError(null);
    if (!/\.(csv|txt)$/i.test(file.name)) {
      return setUploadError(`"${file.name}" isn't a CSV file. Export your transactions as CSV from your bank.`);
    }
    if (file.size > MAX_FILE_BYTES) {
      return setUploadError(`"${file.name}" is larger than 5 MB. Split it into smaller date ranges.`);
    }

    const analysis = analyzeCsv(await file.text());
    if (analysis.file.rows.length === 0) {
      return setUploadError(`"${file.name}" has no data rows.`);
    }
    if (analysis.file.rows.length > MAX_IMPORT_ROWS) {
      return setUploadError(
        `"${file.name}" has ${analysis.file.rows.length.toLocaleString()} rows; the limit is ${MAX_IMPORT_ROWS.toLocaleString()} per import. Split it by date range.`,
      );
    }

    setLoaded({ fileName: file.name, file: analysis.file, autoMapping: analysis.mapping });
    setMapping(analysis.mapping);
    setDateFormat(analysis.dateGuess.format);
    setDateAmbiguous(analysis.dateGuess.ambiguous);
    setDecimalSeparator(analysis.decimalSeparator);
    if (!accountId && accountOptions.length === 1) setAccountId(accountOptions[0].value);
    setStep("map");
  };

  const onMappingChange = (next: ColumnMapping) => {
    setMapping(next);
    if (!loaded) return;
    // Re-detect formats when the user points date/amount at different columns.
    const formats = detectFormats(loaded.file, next);
    if (next.date !== mapping.date) {
      setDateFormat(formats.dateGuess.format);
      setDateAmbiguous(formats.dateGuess.ambiguous);
    }
    if (next.amount !== mapping.amount || next.debit !== mapping.debit || next.credit !== mapping.credit) {
      setDecimalSeparator(formats.decimalSeparator);
    }
  };

  const onCreateAccount = (name: string) =>
    createAccount.mutate({ name }, { onSuccess: ({ data }) => setAccountId(data.id) });

  const onValidate = async () => {
    if (!loaded || !dateFormat || !accountId) return;

    const validated = validateRows(loaded.file, { mapping, dateFormat, decimalSeparator });

    // Only rows that could be imported are checked against the account.
    const candidates = validated
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.status !== "error" && row.date && row.payee !== null && row.amount !== null);

    let duplicateOf: (string | null)[] = validated.map(() => null);
    setDuplicateCheckFailed(false);
    if (candidates.length > 0) {
      try {
        const matches = await checkDuplicates.mutateAsync({
          accountId,
          rows: candidates.map(({ row }) => ({ date: row.date!, amount: row.amount!, payee: row.payee! })),
        });
        candidates.forEach(({ index }, i) => (duplicateOf[index] = matches[i]));
      } catch {
        setDuplicateCheckFailed(true);
        duplicateOf = validated.map(() => null);
      }
    }

    const final = applyDuplicates(validated, duplicateOf);
    setRows(final);
    // Valid and warning rows are in by default; duplicates are out; errors can never be in.
    setIncluded(new Set(final.filter((r) => r.status === "valid" || r.status === "warning").map((r) => r.line)));
    setStep("preview");
  };

  const onToggle = (line: number, include: boolean) =>
    setIncluded((prev) => {
      const next = new Set(prev);
      if (include) next.add(line);
      else next.delete(line);
      return next;
    });

  const onToggleDuplicates = (include: boolean) =>
    setIncluded((prev) => {
      const next = new Set(prev);
      for (const row of rows) {
        if (row.status !== "duplicate") continue;
        if (include) next.add(row.line);
        else next.delete(row.line);
      }
      return next;
    });

  const onImport = () => {
    if (!loaded || !accountId) return;
    const toImport = rows.filter((r) => isImportable(r) && included.has(r.line));
    const skipped = rows.filter((r) => !(isImportable(r) && included.has(r.line)));

    bulkCreate.mutate(
      toImport.map((r) => ({
        accountId,
        date: r.date!,
        payee: r.payee!,
        amount: r.amount!,
        notes: r.notes,
        categoryId: null,
      })),
      {
        onSuccess: ({ data }) => {
          setResult({
            imported: data.length,
            duplicatesSkipped: skipped.filter((r) => r.status === "duplicate").length,
            rejected: skipped.filter((r) => r.status === "error").length,
            excluded: skipped.filter((r) => r.status === "valid" || r.status === "warning").length,
            accountName,
            skippedCsv:
              skipped.length > 0
                ? buildSkippedRowsCsv(loaded.file.headers, skipped.map((row) => ({ row, reason: reasonFor(row) })))
                : null,
          });
          setStep("done");
        },
      },
    );
  };

  const onDownload = () => {
    if (!result?.skippedCsv || !loaded) return;
    const base = loaded.fileName.replace(/\.[^.]+$/, "");
    downloadTextFile(`${base}-skipped-rows.csv`, result.skippedCsv);
    toast.success("Skipped rows downloaded");
  };

  const currentIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" aria-label="Import progress">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2" aria-current={s.key === step ? "step" : undefined}>
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                i < currentIndex && "border-primary bg-primary text-primary-foreground",
                i === currentIndex && "border-primary text-primary",
                i > currentIndex && "text-muted-foreground",
              )}
            >
              {i + 1}
            </span>
            <span className={cn(i === currentIndex ? "font-medium" : "text-muted-foreground")}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border" aria-hidden />}
          </li>
        ))}
      </ol>

      {step === "upload" && <UploadStep onFile={onFile} error={uploadError} />}

      {step === "map" && loaded && (
        <MappingStep
          file={loaded.file}
          fileName={loaded.fileName}
          mapping={mapping}
          autoMapping={loaded.autoMapping}
          onMappingChange={onMappingChange}
          dateFormat={dateFormat}
          dateAmbiguous={dateAmbiguous}
          onDateFormatChange={(f) => {
            setDateFormat(f);
            setDateAmbiguous(false);
          }}
          decimalSeparator={decimalSeparator}
          onDecimalSeparatorChange={setDecimalSeparator}
          accountId={accountId}
          accountOptions={accountOptions}
          onAccountChange={setAccountId}
          onCreateAccount={onCreateAccount}
          accountsLoading={accountsQuery.isLoading || createAccount.isPending}
          onBack={reset}
          onContinue={onValidate}
          busy={checkDuplicates.isPending}
        />
      )}

      {step === "preview" && (
        <PreviewStep
          rows={rows}
          included={included}
          onToggle={onToggle}
          onToggleDuplicates={onToggleDuplicates}
          onBack={() => setStep("map")}
          onImport={onImport}
          busy={bulkCreate.isPending}
          duplicateCheckFailed={duplicateCheckFailed}
        />
      )}

      {step === "done" && result && (
        <ResultStep result={result} onDownload={onDownload} onImportAnother={reset} />
      )}
    </div>
  );
};

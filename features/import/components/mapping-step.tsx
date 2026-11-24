"use client";

import { AlertTriangle, ArrowLeft, ArrowRight, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select as CreatableSelect } from "@/components/select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DATE_FORMATS,
  DATE_FORMAT_LABELS,
  FIELD_LABELS,
  IMPORT_FIELDS,
  validateMapping,
  type ColumnMapping,
  type DateFormat,
  type DecimalSeparator,
  type ImportField,
  type ParsedFile,
} from "@/lib/import";

type Props = {
  file: ParsedFile;
  fileName: string;
  mapping: ColumnMapping;
  autoMapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  dateFormat: DateFormat | null;
  dateAmbiguous: boolean;
  onDateFormatChange: (format: DateFormat) => void;
  decimalSeparator: DecimalSeparator;
  onDecimalSeparatorChange: (value: DecimalSeparator) => void;
  accountId: string | null;
  accountOptions: { label: string; value: string }[];
  onAccountChange: (id: string | null) => void;
  onCreateAccount: (name: string) => void;
  accountsLoading: boolean;
  onBack: () => void;
  onContinue: () => void;
  busy: boolean;
};

const SKIP = "__skip";
const PREVIEW_ROWS = 5;

const fieldFor = (mapping: ColumnMapping, column: number): ImportField | null =>
  (Object.entries(mapping).find(([, index]) => index === column)?.[0] as ImportField) ?? null;

export const MappingStep = (props: Props) => {
  const { file, mapping, autoMapping, dateFormat } = props;
  const problems = validateMapping(mapping);
  if (!props.accountId) problems.push("Choose the account these transactions belong to.");
  if (mapping.date !== undefined && !dateFormat) {
    problems.push("The date column doesn't match a known format; pick the format below.");
  }

  const setColumnField = (column: number, value: string) => {
    const next: ColumnMapping = { ...mapping };
    // A column holds one field and a field comes from one column.
    for (const field of IMPORT_FIELDS) {
      if (next[field] === column) delete next[field];
    }
    if (value !== SKIP) {
      const field = value as ImportField;
      next[field] = column;
      if (field === "amount") {
        delete next.debit;
        delete next.credit;
      }
      if (field === "debit" || field === "credit") delete next.amount;
    }
    props.onMappingChange(next);
  };

  const sample = file.rows.slice(0, PREVIEW_ROWS);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="import-account">Import into account</Label>
          <div>
            <CreatableSelect
              inputId="import-account"
              placeholder={props.accountsLoading ? "Loading accounts…" : "Choose or create an account"}
              options={props.accountOptions}
              value={props.accountId}
              onChange={(value) => props.onAccountChange(value ?? null)}
              onCreate={props.onCreateAccount}
              disabled={props.accountsLoading || props.busy}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date-format">Date format</Label>
          <Select
            value={dateFormat ?? undefined}
            onValueChange={(value) => props.onDateFormatChange(value as DateFormat)}
          >
            <SelectTrigger id="date-format" className="w-full">
              <SelectValue placeholder="Pick a date format" />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map((format) => (
                <SelectItem key={format} value={format}>
                  {DATE_FORMAT_LABELS[format]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {props.dateAmbiguous && (
            <p className="flex gap-1.5 text-xs text-warning">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              No day above 12 in this file, so 03/04 could be March 4 or April 3. Check this is right.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="decimal-separator">Decimal separator</Label>
          <Select
            value={props.decimalSeparator}
            onValueChange={(value) => props.onDecimalSeparatorChange(value as DecimalSeparator)}
          >
            <SelectTrigger id="decimal-separator" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=".">Dot: 1,234.56</SelectItem>
              <SelectItem value=",">Comma: 1.234,56</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium">Match each column to a field</h3>
          <p className="text-xs text-muted-foreground">
            {file.rows.length.toLocaleString()} data rows in {props.fileName}
            {file.skippedPreambleLines > 0 && ` · ${file.skippedPreambleLines} preamble line(s) skipped`}
            {file.blankLines > 0 && ` · ${file.blankLines} blank line(s) skipped`}
            {!file.hasHeader && " · no header row found"}
          </p>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted/60">
              <tr>
                {file.headers.map((header, column) => {
                  const field = fieldFor(mapping, column);
                  const auto = field !== null && autoMapping[field] === column;
                  return (
                    <th key={column} scope="col" className="p-2 text-left align-top font-normal">
                      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <span className="truncate" title={header}>{header}</span>
                        {auto && (
                          <span className="rounded bg-primary/10 px-1.5 py-px text-[11px] font-medium text-primary">
                            auto
                          </span>
                        )}
                      </div>
                      <Select value={field ?? SKIP} onValueChange={(value) => setColumnField(column, value)}>
                        <SelectTrigger
                          aria-label={`Field for column ${header}`}
                          className={cn("h-8 min-w-36", field ? "border-primary/50 text-foreground" : "text-muted-foreground")}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SKIP}>Don&apos;t import</SelectItem>
                          {IMPORT_FIELDS.map((f) => (
                            <SelectItem key={f} value={f}>
                              {FIELD_LABELS[f]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sample.map((row) => (
                <tr key={row.line} className="border-t">
                  {file.headers.map((_, column) => (
                    <td
                      key={column}
                      className={cn(
                        "max-w-56 truncate px-3 py-2 font-mono text-xs",
                        fieldFor(mapping, column) ? "text-foreground" : "text-muted-foreground/70",
                      )}
                      title={row.cells[column]}
                    >
                      {row.cells[column] || <span className="text-muted-foreground/50">(empty)</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            Columns marked <em>auto</em> were matched from the header or the cell contents. Use Amount for a single
            signed column, or Debit and Credit when the bank splits money out and money in.
          </span>
        </p>
      </div>

      {problems.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm" aria-live="polite">
          {problems.map((problem) => (
            <li key={problem} className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              {problem}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={props.onBack} disabled={props.busy}>
          <ArrowLeft className="size-4" aria-hidden /> Choose another file
        </Button>
        <Button onClick={props.onContinue} disabled={problems.length > 0 || props.busy}>
          {props.busy ? "Checking rows…" : "Validate and preview"}
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
};

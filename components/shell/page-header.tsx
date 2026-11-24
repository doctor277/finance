import { Suspense } from "react";

import { AccountFilter } from "@/components/account-filter";
import { DateFilter } from "@/components/date-filter";

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Show the account and date-range filters (they live in the URL). */
  filters?: boolean;
};

export const PageHeader = ({ title, description, actions, filters }: Props) => (
  <header className="mb-6 space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
    {filters && (
      <Suspense fallback={<div className="h-9" />}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <AccountFilter />
          <DateFilter />
        </div>
      </Suspense>
    )}
  </header>
);

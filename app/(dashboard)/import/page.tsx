import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { ImportWizard } from "@/features/import/components/import-wizard";

export const metadata: Metadata = { title: "Import CSV" };

export default function ImportPage() {
  return (
    <>
      <PageHeader
        title="Import a bank CSV"
        description="Any bank export works. Columns are matched for you, every row is checked, and nothing is saved until you confirm."
      />
      <section className="rounded-lg border bg-card p-5 sm:p-6">
        <ImportWizard />
      </section>
    </>
  );
}

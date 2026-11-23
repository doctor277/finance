import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportWizard } from "@/features/import/components/import-wizard";

export const metadata: Metadata = { title: "Import CSV" };

export default function ImportPage() {
  return (
    <div className="mx-auto w-full max-w-screen-2xl pb-10 -mt-24">
      <Card className="border-none drop-shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Import bank transactions</CardTitle>
          <CardDescription>
            Upload a CSV export from any bank. Columns are matched automatically, every row is checked, and you
            review the result before anything is saved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportWizard />
        </CardContent>
      </Card>
    </div>
  );
}

import { auth } from "@clerk/nextjs/server";

import { AppShell } from "@/components/shell/app-shell";
import { SheetProvider } from "@/providers/sheet-provider";

const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  // Middleware already redirects signed-out visitors; this is the
  // resource-level check so the pages stay protected even if the matcher changes.
  await auth.protect();

  return (
    <AppShell>
      <SheetProvider />
      {children}
    </AppShell>
  );
};

export default DashboardLayout;

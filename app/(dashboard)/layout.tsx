import { auth } from "@clerk/nextjs/server";

import { Header } from "@/components/header";

type Props = {
  children: React.ReactNode;
};

const DashboardLayout = async ({ children }: Props) => {
  // Middleware already redirects signed-out visitors; this is the
  // resource-level check so the pages stay protected even if the matcher changes.
  await auth.protect();

  return (
    <>
      <Header />
      <main className="px-3 lg:px-14">{children}</main>
    </>
  );
};

export default DashboardLayout;

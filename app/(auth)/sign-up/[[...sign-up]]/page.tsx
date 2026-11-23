import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { ClerkLoaded, ClerkLoading, SignUp } from "@clerk/nextjs";

import { AuthLayout } from "@/components/shell/auth-layout";

export const metadata: Metadata = { title: "Sign up" };

export default function Page() {
  return (
    <AuthLayout>
      <ClerkLoaded>
        <SignUp path="/sign-up" />
      </ClerkLoaded>
      <ClerkLoading>
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </ClerkLoading>
    </AuthLayout>
  );
}

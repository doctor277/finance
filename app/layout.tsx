import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

// Fonts are self-hosted from npm (Fontsource), so building never depends on
// fetching Google Fonts: CI builds failed when Google returned a font URL that
// next/font/google could not parse.
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-sans/latin-700.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";

import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: { default: "Tally", template: "%s · Tally" },
  description:
    "Personal finance tracker built around a careful CSV import: map any bank export, see why each row passes or fails, skip duplicates, then report on it.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#1f5c47",
          colorText: "#16211c",
          fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
          borderRadius: "0.5rem",
        },
      }}
    >
      <html lang="en-CA">
        <body className="font-sans">
          <QueryProvider>
            <Toaster position="bottom-right" />
            {children}
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

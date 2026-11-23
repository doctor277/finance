import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

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
          fontFamily: "var(--font-plex-sans)",
          borderRadius: "0.5rem",
        },
      }}
    >
      <html lang="en-CA">
        <body className={`${plexSans.variable} ${plexMono.variable} font-sans`}>
          <QueryProvider>
            <Toaster position="bottom-right" />
            {children}
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

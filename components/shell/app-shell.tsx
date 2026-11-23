"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { ClerkLoaded, UserButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "./logo";
import { NavLinks } from "./nav";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr] lg:bg-[linear-gradient(to_right,var(--sidebar)_15rem,var(--background)_15rem)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>

      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-sidebar px-3 py-5 text-sidebar-foreground lg:flex">
        <Link href="/" className="mb-8 rounded-md px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-foreground/70">
          <Logo />
        </Link>
        <NavLinks />
        <div className="mt-auto flex items-center gap-3 px-3">
          <ClerkLoaded>
            <UserButton showName appearance={{ elements: { userButtonOuterIdentifier: { color: "#e6efe9", fontSize: "0.875rem" } } }} />
          </ClerkLoaded>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 grid grid-cols-[2.5rem_1fr_2.5rem] items-center bg-sidebar px-4 py-3 text-sidebar-foreground lg:hidden">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open menu"
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 border-none bg-sidebar px-3 py-5 text-sidebar-foreground">
            <SheetTitle className="mb-6 px-3 text-sidebar-foreground">
              <Logo />
            </SheetTitle>
            <NavLinks onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
        <Link href="/" aria-label="Tally overview" className="justify-self-center">
          <Logo />
        </Link>
        <div className="flex justify-end">
          <ClerkLoaded>
            <UserButton />
          </ClerkLoaded>
        </div>
      </header>

      <main id="main" className="min-w-0 px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
};

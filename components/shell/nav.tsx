"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileUp, Landmark, LayoutDashboard, ListOrdered, Tags } from "lucide-react";

import { cn } from "@/lib/utils";

const PRIMARY = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ListOrdered },
  { href: "/import", label: "Import CSV", icon: FileUp },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const SETUP = [
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/categories", label: "Categories", icon: Tags },
];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

/** Navigation links for the sidebar and the mobile menu. Keeps the query string for filters. */
export const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => {
  const pathname = usePathname();

  const renderLink = ({ href, label, icon: Icon }: (typeof PRIMARY)[number]) => {
    const active = isActive(pathname, href);
    return (
      <li key={href}>
        <Link
          href={href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-foreground/70",
            active
              ? "bg-sidebar-accent font-medium text-sidebar-foreground"
              : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
          )}
        >
          <Icon className="size-4 shrink-0" aria-hidden />
          {label}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label="Main" className="space-y-6">
      <ul className="space-y-0.5">{PRIMARY.map(renderLink)}</ul>
      <div>
        <p className="px-3 pb-1.5 text-xs font-medium text-sidebar-muted">Set up</p>
        <ul className="space-y-0.5">{SETUP.map(renderLink)}</ul>
      </div>
    </nav>
  );
};

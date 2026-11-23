import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Stat = {
  label: string;
  /** Milliunits, or a plain count when `isCount` is set. */
  value: number;
  isCount?: boolean;
  /** Percent change vs the previous period; null when there was nothing before. */
  change?: number | null;
  /** For spending, going up is bad: flips the colour, not the arrow. */
  upIsGood?: boolean;
};

const changeText = (change: number) =>
  `${Math.abs(change) < 0.5 ? "about the same as" : `${change > 0 ? "up" : "down"} ${Math.abs(change).toFixed(0)}% vs`} previous period`;

/** Key figures in one panel, separated by rules rather than boxed as separate cards. */
export const StatStrip = ({ stats }: { stats: Stat[] }) => (
  <dl className="grid grid-cols-1 divide-y rounded-lg border bg-card sm:grid-cols-2 sm:divide-y-0 lg:flex lg:divide-x">
    {stats.map((stat) => {
      const { change } = stat;
      const flat = change === undefined || change === null || Math.abs(change) < 0.5;
      const good = !flat && (change! > 0) === (stat.upIsGood ?? true);
      const Icon = flat ? Minus : change! > 0 ? ArrowUpRight : ArrowDownRight;
      return (
        <div key={stat.label} className="min-w-0 flex-1 px-5 py-4">
          <dt className="text-sm text-muted-foreground">{stat.label}</dt>
          <dd className="mt-1 truncate text-2xl font-semibold tracking-tight tabular">
            {stat.isCount ? stat.value.toLocaleString("en-CA") : money(stat.value)}
          </dd>
          {change !== undefined && (
            <dd
              className={cn(
                "mt-1 flex items-center gap-1 text-xs",
                change === null || flat ? "text-muted-foreground" : good ? "text-success" : "text-destructive",
              )}
            >
              {change === null ? (
                "Nothing in the previous period"
              ) : (
                <>
                  <Icon className="size-3.5" aria-hidden />
                  {changeText(change)}
                </>
              )}
            </dd>
          )}
        </div>
      );
    })}
  </dl>
);

export const StatStripSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="flex divide-x rounded-lg border bg-card" aria-busy="true" aria-label="Loading figures">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex-1 space-y-2 px-5 py-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3 w-40" />
      </div>
    ))}
  </div>
);

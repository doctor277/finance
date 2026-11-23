import { money, percent } from "@/lib/format";

type Item = { name: string; spent: number; share: number; count?: number };

/**
 * Spending by category as a ranked list of bars: easier to compare than a pie,
 * every value is printed, and it reads correctly with a screen reader.
 * One hue (magnitude), lengths relative to the largest category.
 */
export const CategoryBars = ({ items, limit }: { items: Item[]; limit?: number }) => {
  const shown = limit ? items.slice(0, limit) : items;
  const max = Math.max(...shown.map((i) => i.spent), 1);

  return (
    <ol className="space-y-3">
      {shown.map((item) => (
        <li key={item.name}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">
              {item.name}
              {item.count !== undefined && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {item.count} {item.count === 1 ? "transaction" : "transactions"}
                </span>
              )}
            </span>
            <span className="shrink-0 tabular">
              {money(item.spent)}
              <span className="ml-2 inline-block w-10 text-right text-xs text-muted-foreground">{percent(item.share)}</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted" aria-hidden>
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${Math.max((item.spent / max) * 100, 1.5)}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
};

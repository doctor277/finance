import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/** A titled section of a page. */
export const Panel = ({ title, description, action, children, className }: Props) => (
  <section className={cn("rounded-lg border bg-card", className)} aria-label={title}>
    <div className="flex flex-wrap items-start justify-between gap-2 border-b px-5 py-3.5">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </section>
);

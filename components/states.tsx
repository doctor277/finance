import { AlertCircle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyProps = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
};

/** What to do next when there's nothing to show. */
export const EmptyState = ({ icon: Icon, title, description, action, className }: EmptyProps) => (
  <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-14 text-center", className)}>
    <span className="flex size-11 items-center justify-center rounded-full bg-accent text-primary">
      <Icon className="size-5" aria-hidden />
    </span>
    <div className="space-y-1">
      <p className="font-medium">{title}</p>
      <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
    {action}
  </div>
);

/** A failed request: say what failed and offer a retry. */
export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
    <AlertCircle className="size-6 text-destructive" aria-hidden />
    <p className="text-sm">{message}</p>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RotateCcw className="size-4" aria-hidden /> Try again
      </Button>
    )}
  </div>
);

import { AlertTriangle, CheckCircle2, Copy, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { RowStatus } from "@/lib/import";

const CONFIG: Record<RowStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  valid: { label: "Valid", icon: CheckCircle2, className: "bg-success/10 text-success" },
  warning: { label: "Warning", icon: AlertTriangle, className: "bg-warning/10 text-warning" },
  error: { label: "Error", icon: XCircle, className: "bg-destructive/10 text-destructive" },
  duplicate: { label: "Duplicate", icon: Copy, className: "bg-muted text-muted-foreground" },
};

/** Status is shown with an icon and a word, never by colour alone. */
export const StatusBadge = ({ status }: { status: RowStatus }) => {
  const { label, icon: Icon, className } = CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
};

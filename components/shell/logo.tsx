import { cn } from "@/lib/utils";

/** Tally mark: four strokes and the fifth crossing them. */
export const TallyMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
    <rect width="32" height="32" rx="8" fill="currentColor" opacity="0.14" />
    <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M9 8v16M13.5 8v16M18 8v16M22.5 8v16" />
      <path d="M6.5 21.5 25.5 10.5" />
    </g>
  </svg>
);

export const Logo = ({ className }: { className?: string }) => (
  <span className={cn("flex items-center gap-2.5", className)}>
    <TallyMark />
    <span className="text-lg font-semibold tracking-tight">Tally</span>
  </span>
);

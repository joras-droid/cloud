import { cn } from "@/lib/utils";

/** The green square-and-dot used to mark vegetarian food. */
export function VegMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <rect
        x="1.75"
        y="1.75"
        width="20.5"
        height="20.5"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
      />
      <circle cx="12" cy="12" r="4.25" fill="currentColor" />
    </svg>
  );
}

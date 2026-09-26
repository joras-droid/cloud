import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-line/60 text-ink-soft",
        veg: "bg-herb-soft text-herb",
        spice: "bg-chilli-soft text-chilli",
        gold: "bg-gold-soft text-gold",
        brand: "bg-brand-100 text-brand-700",
        dark: "bg-ink text-cream",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props} />
  );
}

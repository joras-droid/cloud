import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "focus-ring inline-flex items-center justify-center gap-2 font-medium transition-[color,background-color,transform] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand-600 text-white hover:bg-brand-700",
        secondary: "bg-ink text-cream hover:bg-ink/90",
        outline: "border border-line bg-paper text-ink hover:bg-brand-50",
        ghost: "text-ink hover:bg-brand-50",
        danger: "bg-chilli text-white hover:bg-chilli/90",
      },
      size: {
        sm: "h-9 rounded-lg px-3 text-sm",
        md: "h-11 rounded-xl px-5 text-[15px]",
        lg: "h-13 rounded-xl px-7 text-base",
        icon: "size-10 rounded-full",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export function Button({
  className,
  variant,
  size,
  block,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  );
}

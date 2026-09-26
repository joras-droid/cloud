import { Building2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const officesCtaClass =
  "border-0 bg-gradient-to-br from-gold via-brand-600 to-brand-700 text-white shadow-md shadow-gold/25 hover:brightness-[1.03] active:scale-[0.98]";

/** Shared “For offices” call-to-action — nav, menu, and home. */
export function OfficesCtaLink({
  children,
  className,
  size = "md",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <Link
      href="/offices"
      className={cn(buttonVariants({ size }), officesCtaClass, className)}
    >
      <Building2 className="size-4 shrink-0" aria-hidden />
      {children}
    </Link>
  );
}

export function OfficesNavLink({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href="/offices"
      className={cn(
        "focus-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold",
        officesCtaClass,
        className,
      )}
    >
      <Building2 className="size-4 shrink-0" aria-hidden />
      {children}
    </Link>
  );
}

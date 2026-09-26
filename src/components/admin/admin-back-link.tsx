import Link from "next/link";
import { cn } from "@/lib/utils";

/** Sticks to the top of the admin content column while the page scrolls. */
export function AdminBackLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-20 -mx-5 -mt-5 border-b border-line bg-paper px-5 py-2.5 backdrop-blur-md lg:-mx-8 lg:-mt-8 lg:px-8",
        className,
      )}
    >
      <Link
        href={href}
        className="focus-ring inline-block rounded text-sm font-medium text-ink-soft hover:text-ink"
      >
        {children}
      </Link>
    </div>
  );
}

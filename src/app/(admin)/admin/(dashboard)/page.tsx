import Link from "next/link";
import {
  BadgeCheck,
  BanknoteArrowUp,
  MessageSquare,
  PackageX,
  Phone,
  ShoppingBag,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { getDashboardStats } from "@/server/queries/admin";
import { formatPaisa } from "@/lib/money";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const session = await requireAdmin();
  const stats = await getDashboardStats();

  const cards = [
    {
      label: "Orders today",
      value: String(stats.todayOrders),
      icon: ShoppingBag,
      href: "/admin/orders",
    },
    {
      label: "Revenue today",
      value: formatPaisa(stats.todayRevenue),
      icon: BadgeCheck,
      href: "/admin/orders",
    },
    {
      label: "Payments to verify",
      value: String(stats.awaitingPayment),
      icon: BanknoteArrowUp,
      href: "/admin/orders?filter=payment_submitted",
      urgent: stats.awaitingPayment > 0,
    },
    {
      label: "COD to confirm",
      value: String(stats.awaitingConfirm),
      icon: Phone,
      href: "/admin/orders?filter=pending_confirmation",
      urgent: stats.awaitingConfirm > 0,
    },
    {
      label: "Reviews to moderate",
      value: String(stats.pendingReviews),
      icon: MessageSquare,
      href: "/admin/reviews",
      urgent: stats.pendingReviews > 0,
    },
    {
      label: "Sold out items",
      value: String(stats.soldOutItems),
      icon: PackageX,
      href: "/admin/menu",
    },
  ];

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">
          Good to see you, {session.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-ink-soft">
          Anything in red needs you before the food moves.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, href, urgent }) => (
          <Link
            key={label}
            href={href}
            className={cn(
              "focus-ring rounded-card border bg-paper p-5 shadow-card transition-shadow hover:shadow-lifted",
              urgent ? "border-chilli/40 bg-chilli-soft" : "border-line",
            )}
          >
            <div className="flex items-center gap-2">
              <Icon
                className={cn(
                  "size-4",
                  urgent ? "text-chilli" : "text-ink-faint",
                )}
                aria-hidden
              />
              <p className="text-sm font-medium text-ink-soft">{label}</p>
            </div>
            <p className="mt-2 font-display text-3xl font-bold text-ink tabular-nums">
              {value}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

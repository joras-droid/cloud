import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getAdminBadges } from "@/server/queries/admin";
import { logout } from "@/server/actions/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const badges = await getAdminBadges();

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-line bg-paper lg:w-60 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 px-5 py-4">
          <Link
            href="/admin"
            className="focus-ring rounded font-display font-bold text-brand-700"
          >
            Ghar Ko Swad
          </Link>
          <span className="rounded-pill bg-line/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
            {session.role}
          </span>
        </div>

        <AdminNav
          badges={{
            orders: badges.actionableOrders,
            reviews: badges.pendingReviews,
          }}
        />

        <form action={logout} className="mt-auto hidden p-4 lg:block">
          <p className="mb-2 truncate text-xs text-ink-faint">
            {session.email}
          </p>
          <button
            type="submit"
            className="focus-ring rounded-lg text-sm font-medium text-ink-soft hover:text-chilli"
          >
            Sign out
          </button>
        </form>
      </aside>

      <main className="min-w-0 flex-1 p-5 lg:p-8">{children}</main>
    </div>
  );
}

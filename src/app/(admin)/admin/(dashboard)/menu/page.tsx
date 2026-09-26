import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminMenu } from "@/server/queries/admin";
import { MenuTable } from "@/components/admin/menu-table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Menu" };

export default async function AdminMenuPage() {
  const session = await requireAdmin("manager");
  const items = await getAdminMenu();

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Menu</h1>
          <p className="mt-1 text-ink-soft">
            {items.length} items. Open a dish to change the price, photos,
            video, remarks, and whether onion / garlic can be skipped.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/menu/new" className={cn(buttonVariants())}>
            New dish
          </Link>
        </div>
      </header>

      <MenuTable items={items} canEdit={session.role !== "staff"} />
    </div>
  );
}

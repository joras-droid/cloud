import { requireAdmin } from "@/lib/auth/session";
import { OptionGroupEditor } from "@/components/admin/option-group-editor";
import { getAdminModifierGroups } from "@/server/queries/admin-menu";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customer options" };

export default async function OptionsPage() {
  await requireAdmin("manager");
  const groups = await getAdminModifierGroups();

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">
          Customer options
        </h1>
        <p className="mt-1 max-w-2xl text-ink-soft">
          These groups appear on the storefront when a customer adds a dish —
          spice, onion and garlic, extra achar. Create the group here, then
          tick it on each dish.
        </p>
      </header>

      <div className="grid gap-8">
        {groups.map((group) => (
          <div key={group.id}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Used on {group.usedBy} {group.usedBy === 1 ? "dish" : "dishes"}
            </p>
            <OptionGroupEditor group={group} />
          </div>
        ))}

        <div>
          <h2 className="mb-3 font-display text-lg font-bold">New option group</h2>
          <OptionGroupEditor />
        </div>
      </div>
    </div>
  );
}

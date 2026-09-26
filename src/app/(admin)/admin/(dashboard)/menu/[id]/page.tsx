import { AdminBackLink } from "@/components/admin/admin-back-link";
import { ItemEditor } from "@/components/admin/item-editor";
import { getAdminCategories, getAdminItem } from "@/server/queries/admin-menu";

export const dynamic = "force-dynamic";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("manager");
  const { id } = await params;

  if (id === "new") {
    const categories = await getAdminCategories();
    return (
      <ItemPageFrame title="New dish">
        <ItemEditor item={null} categories={categories} />
      </ItemPageFrame>
    );
  }

  const [item, categories] = await Promise.all([
    getAdminItem(id),
    getAdminCategories(),
  ]);
  if (!item) notFound();

  return (
    <ItemPageFrame title={`Edit ${item.nameEn}`}>
      <ItemEditor item={item} categories={categories} />
    </ItemPageFrame>
  );
}

function ItemPageFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <AdminBackLink href="/admin/menu">← Menu</AdminBackLink>
      <h1 className="mb-6 mt-4 font-display text-2xl font-bold text-ink">{title}</h1>
      {children}
    </div>
  );
}

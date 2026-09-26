import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { getAdminSection } from "@/server/queries/admin-orders";
import { getAdminMenu } from "@/server/queries/admin";
import { getAdminMediaLibrary } from "@/server/queries/admin-menu";
import { SectionEditor } from "@/components/admin/section-editor";

export const dynamic = "force-dynamic";

export default async function SectionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("manager");
  const { id } = await params;
  const section = await getAdminSection(id);
  if (!section) notFound();

  const [menu, media] = await Promise.all([
    getAdminMenu(),
    getAdminMediaLibrary(),
  ]);

  return (
    <div>
      <AdminBackLink href="/admin/sections">← Sections</AdminBackLink>
      <h1 className="mb-2 mt-4 font-display text-2xl font-bold">{section.titleEn}</h1>
      <p className="mb-6 text-sm text-ink-soft">
        Change words and photos like a WordPress page. Each block saves on its
        own.
      </p>
      <SectionEditor
        section={section}
        blocks={section.blocks}
        media={media}
        items={menu.map((i) => ({ id: i.id, nameEn: i.nameEn }))}
      />
    </div>
  );
}

import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminSections } from "@/server/queries/admin-orders";
import { saveSection } from "@/server/actions/content";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sections" };

export default async function SectionsPage() {
  await requireAdmin("manager");
  const sections = await getAdminSections();

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">Sections</h1>
        <p className="mt-1 text-ink-soft">
          Highlight blocks the kitchen writes — recipes, sourcing, how it is
          made. Click a section to change text and photos, the same way you
          would in WordPress.
        </p>
      </header>

      <ul className="mb-10 divide-y divide-line overflow-hidden rounded-card border border-line bg-paper">
        {sections.map((section) => (
          <li key={section.id} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <Link
                href={`/admin/sections/${section.id}`}
                className="focus-ring font-medium text-ink hover:text-brand-700"
              >
                {section.titleEn}
              </Link>
              <p className="text-sm text-ink-faint">
                {section.pageScope} · {section.blocks.length} blocks ·{" "}
                {section.isPublished ? "Live" : "Draft"}
              </p>
            </div>
            <Link
              href={`/admin/sections/${section.id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Edit
            </Link>
          </li>
        ))}
        {sections.length === 0 ? (
          <li className="p-8 text-center text-ink-soft">No sections yet.</li>
        ) : null}
      </ul>

      <form
        action={saveSection}
        className="grid max-w-xl gap-3 rounded-card border border-line bg-paper p-5"
      >
        <h2 className="font-display text-lg font-bold">New section</h2>
        <div>
          <Label htmlFor="titleEn">Title (English)</Label>
          <Input id="titleEn" name="titleEn" required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="titleNe">Title (Nepali)</Label>
          <Input id="titleNe" name="titleNe" className="mt-1.5" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pageScope">Page</Label>
            <Select id="pageScope" name="pageScope" defaultValue="home" className="mt-1.5">
              <option value="home">Home</option>
              <option value="story">Our story</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="theme">Theme</Label>
            <Select id="theme" name="theme" defaultValue="warm" className="mt-1.5">
              <option value="light">Light</option>
              <option value="warm">Warm</option>
              <option value="dark">Dark</option>
              <option value="accent">Accent</option>
            </Select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isPublished" className="size-4 accent-brand-600" />
          Publish immediately
        </label>
        <Button type="submit">Create section</Button>
      </form>
    </div>
  );
}

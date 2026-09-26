import Image from "next/image";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminMediaLibrary } from "@/server/queries/admin-menu";
import { saveMedia } from "@/server/actions/content";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";

export const dynamic = "force-dynamic";
export const metadata = { title: "Media" };

export default async function MediaPage() {
  await requireAdmin("manager");
  const media = await getAdminMediaLibrary();

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">Media</h1>
        <p className="mt-1 text-ink-soft">
          Photos and recipe videos. Alt text is required — a screen reader
          should be able to name the dish.
        </p>
      </header>

      <form
        action={saveMedia}
        className="mb-8 grid max-w-xl gap-3 rounded-card border border-line bg-paper p-5"
      >
        <h2 className="font-display text-lg font-bold">Add media</h2>
        <div>
          <Label htmlFor="url">URL</Label>
          <Input id="url" name="url" type="url" required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="altEn">Alt text (English)</Label>
          <Input id="altEn" name="altEn" required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="altNe">Alt text (Nepali)</Label>
          <Input id="altNe" name="altNe" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="kind">Kind</Label>
          <Select id="kind" name="kind" defaultValue="image" className="mt-1.5">
            <option value="image">Photo</option>
            <option value="video">Recipe / process video</option>
          </Select>
        </div>
        <Button type="submit">Add to library</Button>
      </form>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {media.map((item) => (
          <li key={item.id} className="overflow-hidden rounded-card border border-line bg-paper">
            <div className="relative aspect-[4/3] bg-line">
              {item.kind === "image" && item.url ? (
                <Image
                  src={item.url}
                  alt={item.altEn ?? ""}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 50vw, 30vw"
                />
              ) : (
                <div className="grid h-full place-items-center text-sm text-ink-faint">
                  {item.kind}
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-medium">{item.altEn ?? "No alt text"}</p>
              {item.altNe ? (
                <p className="text-sm text-ink-faint">{item.altNe}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

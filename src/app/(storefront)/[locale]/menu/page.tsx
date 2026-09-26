import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ItemCard } from "@/components/menu/item-card";
import { CategoryRail } from "@/components/menu/category-rail";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getMenu } from "@/server/queries/menu";
import { cn, pick } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "menu" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function MenuPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("menu");
  const menu = await getMenu();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-ink-soft">{t("subtitle")}</p>
        </div>
        <Link
          href="/offices"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "shrink-0",
          )}
        >
          {t("forOffices")}
        </Link>
      </header>

      {menu.length === 0 ? (
        <p className="py-16 text-center text-ink-soft">{t("empty")}</p>
      ) : (
        <>
          <CategoryRail
            categories={menu.map((c) => ({
              slug: c.slug,
              name: pick(locale, c.nameEn, c.nameNe),
            }))}
          />

          <div className="mt-8 space-y-12">
            {menu.map((category, ci) => (
              <section
                key={category.id}
                id={category.slug}
                // Offsets the sticky header so anchor jumps don't hide the heading.
                className="scroll-mt-32"
              >
                <h2 className="mb-4 font-display text-2xl font-bold text-ink">
                  {pick(locale, category.nameEn, category.nameNe)}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {category.items.map((item, ii) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      priority={ci === 0 && ii < 3}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ItemCard } from "@/components/menu/item-card";
import { HomeReviews } from "@/components/reviews/home-reviews";
import { buttonVariants } from "@/components/ui/button";
import { getMenu } from "@/server/queries/menu";
import { getRecentReviews } from "@/server/queries/reviews";
import { getPublishedSections } from "@/server/queries/sections";
import { SectionRenderer } from "@/components/sections/section-renderer";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export const revalidate = 3600;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const [menu, sections, reviews] = await Promise.all([
    getMenu(),
    getPublishedSections("home"),
    getRecentReviews(8),
  ]);

  const featured = menu.flatMap((c) => c.items).slice(0, 6);

  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-brand-50/70">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:py-20 lg:grid-cols-2">
          <div>
            <h1 className="font-display text-4xl font-bold leading-[1.1] text-ink sm:text-5xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-soft">
              {t("heroSubtitle")}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/menu"
                className={cn(buttonVariants({ size: "lg" }), "gap-2")}
              >
                {t("orderNow")}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/story"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                {locale === "ne" ? "हाम्रो कथा" : "Our story"}
              </Link>
            </div>
          </div>

          <HomeReviews reviews={reviews} locale={locale} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
              {t("featured")}
            </h2>
            <p className="mt-1 text-ink-soft">{t("featuredSubtitle")}</p>
          </div>
          <Link
            href="/menu"
            className="focus-ring hidden shrink-0 items-center gap-1 rounded-lg text-sm font-semibold text-brand-700 hover:text-brand-800 sm:inline-flex"
          >
            {t("viewMenu")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((item, i) => (
            <ItemCard key={item.id} item={item} priority={i < 3} />
          ))}
        </div>
      </section>

      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} locale={locale} />
      ))}
    </>
  );
}

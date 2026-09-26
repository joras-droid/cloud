import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { HomeOfficesSection } from "@/components/home/home-offices-section";
import { ItemCard } from "@/components/menu/item-card";
import { CategoryRail } from "@/components/menu/category-rail";
import { OfficesCtaLink } from "@/components/office/offices-cta-link";
import { HomeReviews } from "@/components/reviews/home-reviews";
import { SectionRenderer } from "@/components/sections/section-renderer";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/i18n/routing";
import { getMenu } from "@/server/queries/menu";
import { getRecentReviews } from "@/server/queries/reviews";
import { getPublishedSections } from "@/server/queries/sections";
import { cn, pick } from "@/lib/utils";

export const revalidate = 3600;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tNav = await getTranslations("nav");
  const [menu, sections, reviews] = await Promise.all([
    getMenu(),
    getPublishedSections("home"),
    getRecentReviews(8),
  ]);

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
              <OfficesCtaLink size="lg">{tNav("forOffices")}</OfficesCtaLink>
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
        <div className="mb-6">
          <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
            {t("fullMenu")}
          </h2>
          <p className="mt-1 text-ink-soft">{t("fullMenuSubtitle")}</p>
        </div>

        {menu.length === 0 ? (
          <p className="py-12 text-center text-ink-soft">{t("viewMenu")}</p>
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
                  className="scroll-mt-32"
                >
                  <h3 className="mb-4 font-display text-2xl font-bold text-ink">
                    {pick(locale, category.nameEn, category.nameNe)}
                  </h3>
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
      </section>

      <HomeOfficesSection />

      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} locale={locale} />
      ))}
    </>
  );
}

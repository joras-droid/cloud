import Image from "next/image";
import { ArrowRight, Leaf, Timer, Sprout } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ItemCard } from "@/components/menu/item-card";
import { buttonVariants } from "@/components/ui/button";
import { getMenu } from "@/server/queries/menu";
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
  const [menu, sections] = await Promise.all([
    getMenu(),
    getPublishedSections("home"),
  ]);

  const featured = menu.flatMap((c) => c.items).slice(0, 6);
  const heroImage = featured[0]?.image;

  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-brand-50">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:py-20 lg:grid-cols-2">
          <div>
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-pill bg-herb-soft px-3 py-1 text-xs font-semibold text-herb">
              <Sprout className="size-3.5" aria-hidden />
              {locale === "ne"
                ? "स्थानीय किसानबाट अर्ग्यानिक"
                : "Organic, from local farms"}
            </p>
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

            <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
              {[
                {
                  icon: Timer,
                  value: locale === "ne" ? "२५ मिनेट" : "25 min",
                  label: locale === "ne" ? "औसत तयारी" : "Average prep",
                },
                {
                  icon: Leaf,
                  value: "100%",
                  label:
                    locale === "ne" ? "ताजा सामग्री" : "Fresh ingredients",
                },
                {
                  icon: Sprout,
                  value: "12",
                  label: locale === "ne" ? "स्थानीय किसान" : "Local farms",
                },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <Icon className="size-5 text-brand-600" aria-hidden />
                  <div>
                    <dt className="sr-only">{label}</dt>
                    <dd className="font-display text-lg font-bold leading-none text-ink">
                      {value}
                    </dd>
                    <p className="mt-0.5 text-xs text-ink-soft">{label}</p>
                  </div>
                </div>
              ))}
            </dl>
          </div>

          {heroImage ? (
            <div className="relative aspect-[5/4] overflow-hidden rounded-card shadow-lifted lg:aspect-[4/3]">
              <Image
                src={heroImage}
                alt=""
                fill
                // The LCP element on mobile — preloaded, never lazy.
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          ) : null}
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

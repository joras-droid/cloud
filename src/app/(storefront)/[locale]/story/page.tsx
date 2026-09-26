import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublishedSections } from "@/server/queries/sections";
import { getRecentReviews } from "@/server/queries/reviews";
import { SectionRenderer } from "@/components/sections/section-renderer";
import { ReviewCarousel } from "@/components/reviews/review-carousel";
import type { Locale } from "@/i18n/routing";

export const revalidate = 3600;

export default async function StoryPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");
  const story = await getTranslations("story");
  const [sections, reviews] = await Promise.all([
    getPublishedSections("story"),
    getRecentReviews(12),
  ]);

  return (
    <div>
      <header className="mx-auto max-w-6xl px-4 pb-8 pt-12">
        <h1 className="font-display text-4xl font-bold text-ink">{t("story")}</h1>
        <p className="mt-2 max-w-xl text-lg text-ink-soft">
          {locale === "ne"
            ? "हामी के हाल्छौं, कहाँबाट आउँछ, र किन घरको स्वाद जस्तो लाग्छ।"
            : "What goes in the pot, where it comes from, and why it tastes like home."}
        </p>
      </header>

      <ReviewCarousel reviews={reviews} locale={locale} />

      <section className="mt-14 border-t border-line bg-paper">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
          <h2 className="font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
            {story("title")}
          </h2>
          <div className="mt-6 space-y-5 text-lg leading-relaxed text-ink-soft">
            <p>{story("p1")}</p>
            <p>{story("p2")}</p>
            <p>{story("p3")}</p>
          </div>
          <p className="mt-8 border-l-4 border-brand-500 pl-4 font-display text-2xl font-bold leading-snug text-ink">
            {story("guarantee")}
          </p>
        </div>
      </section>

      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} locale={locale} />
      ))}
    </div>
  );
}

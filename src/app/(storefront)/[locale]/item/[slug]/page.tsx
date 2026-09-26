import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Flame, Leaf } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MediaRotator } from "@/components/menu/media-rotator";
import { Badge } from "@/components/ui/badge";
import { ItemActions } from "@/components/menu/item-actions";
import { ReviewForm } from "@/components/reviews/review-form";
import { ReviewList } from "@/components/reviews/review-list";
import { getMenu, getMenuItem } from "@/server/queries/menu";
import { getApprovedReviews } from "@/server/queries/reviews";
import { formatPaisa } from "@/lib/money";
import { pick } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

export const revalidate = 3600;

export async function generateStaticParams() {
  const menu = await getMenu();
  return menu.flatMap((c) => c.items).map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const item = await getMenuItem(slug);
  if (!item) return {};
  return {
    title: pick(locale, item.nameEn, item.nameNe),
    description: pick(locale, item.descEn, item.descNe),
    openGraph: item.image ? { images: [item.image] } : undefined,
  };
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const item = await getMenuItem(slug);
  if (!item) notFound();

  const t = await getTranslations("item");
  const tMenu = await getTranslations("menu");
  const reviews = await getApprovedReviews(item.id);

  const name = pick(locale, item.nameEn, item.nameNe);
  const desc = pick(locale, item.descEn, item.descNe);
  const remarks = pick(locale, item.remarksEn, item.remarksNe);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Link
        href="/menu"
        className="focus-ring mb-5 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToMenu")}
      </Link>

      <div className="grid gap-8 sm:grid-cols-2">
        {item.media.length > 0 ? (
          <div className="relative aspect-[4/3] overflow-hidden rounded-card shadow-card">
            <MediaRotator
              slides={item.media}
              alt={pick(locale, item.imageAltEn, item.imageAltNe) || name}
              sizes="(max-width: 640px) 100vw, 50vw"
              priority
              interactive
            />
          </div>
        ) : null}

        <div className="flex flex-col">
          <h1 className="font-display text-3xl font-bold leading-tight text-ink">
            {name}
          </h1>

          <div className="mt-3 flex flex-wrap gap-2">
            {item.isVeg ? (
              <Badge tone="veg">
                <Leaf className="size-3" aria-hidden />
                {locale === "ne" ? "शाकाहारी" : "Vegetarian"}
              </Badge>
            ) : null}
            {item.spiceLevel > 0 ? (
              <Badge tone="spice">
                <Flame className="size-3" aria-hidden />
                {tMenu("spice")} {item.spiceLevel}/4
              </Badge>
            ) : null}
          </div>

          {desc ? (
            <p className="mt-4 leading-relaxed text-ink-soft">{desc}</p>
          ) : null}

          {remarks ? (
            <p className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm leading-relaxed text-ink">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-700">
                {t("remarks")}
              </span>
              {remarks}
            </p>
          ) : null}

          <div className="mt-auto flex items-center gap-4 pt-6">
            <p className="font-display text-2xl font-bold text-ink tabular-nums">
              {formatPaisa(item.basePrice, locale)}
            </p>
            <ItemActions item={item} className="ml-auto h-12 px-6" />
          </div>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="mb-4 font-display text-2xl font-bold text-ink">
          {t("reviews")}
        </h2>
        <ReviewForm itemId={item.id} />
        <ReviewList reviews={reviews} locale={locale} />
      </section>
    </div>
  );
}

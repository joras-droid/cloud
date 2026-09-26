"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Stars } from "@/components/reviews/review-list";
import type { Locale } from "@/i18n/routing";
import { cn, pick } from "@/lib/utils";
import type { RecentReview } from "@/server/queries/reviews";

const PAGE_SIZE = 3;
const SLIDE_MS = 700;
const INTERVAL_MS = 5500;

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

export function ReviewCarousel({
  reviews,
  locale,
}: {
  reviews: RecentReview[];
  locale: Locale;
}) {
  const t = useTranslations("story");
  const item = useTranslations("item");
  const pages = chunk(reviews, PAGE_SIZE);
  const loop = pages.length > 1;
  // The extra first page lets the row slide forward, then snap back unseen.
  const slides = loop ? [...pages, pages[0]!] : pages;

  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!loop || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setAnimate(true);
      setIndex((current) => current + 1);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [loop, paused]);

  useEffect(() => {
    if (!loop || index < pages.length) return;
    const id = window.setTimeout(() => {
      setAnimate(false);
      setIndex(0);
    }, SLIDE_MS);
    return () => window.clearTimeout(id);
  }, [index, loop, pages.length]);

  useEffect(() => {
    if (animate) return;
    const id = window.requestAnimationFrame(() => setAnimate(true));
    return () => window.cancelAnimationFrame(id);
  }, [animate]);

  function show(next: number) {
    setAnimate(true);
    setIndex(next);
  }

  function next() {
    if (!loop) return;
    show(index >= pages.length ? 1 : index + 1);
  }

  function prev() {
    if (!loop) return;
    if (index === 0) {
      setAnimate(false);
      setIndex(pages.length);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setAnimate(true);
          setIndex(pages.length - 1);
        });
      });
      return;
    }
    show(index - 1);
  }

  if (reviews.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-4 pb-2">
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
          {t("reviews")}
        </h2>
        <p className="mt-3 text-ink-soft">{item("noReviews")}</p>
      </section>
    );
  }

  const active = index % pages.length;

  return (
    <section
      className="mx-auto max-w-6xl px-4 pb-2"
      aria-roledescription="carousel"
      aria-label={t("reviews")}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
          {t("reviews")}
        </h2>
        {loop ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={prev}
              aria-label={t("previous")}
              className="focus-ring grid size-10 place-items-center rounded-full border border-line bg-paper text-ink hover:bg-brand-50"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label={t("next")}
              className="focus-ring grid size-10 place-items-center rounded-full border border-line bg-paper text-ink hover:bg-brand-50"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden">
        <div
          className={cn(
            "flex",
            animate &&
              "transition-transform ease-out motion-reduce:transition-none",
          )}
          style={{
            transform: `translateX(-${index * 100}%)`,
            transitionDuration: animate ? `${SLIDE_MS}ms` : "0ms",
          }}
        >
          {slides.map((group, slideIndex) => (
            <ul
              key={slideIndex}
              className="grid w-full shrink-0 grid-cols-1 items-stretch gap-4 md:grid-cols-3"
              aria-hidden={slideIndex !== index}
            >
              {group.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  locale={locale}
                  verifiedLabel={item("verifiedOrder")}
                />
              ))}
            </ul>
          ))}
        </div>
      </div>

      {loop ? (
        <div className="mt-5 flex justify-center gap-2">
          {pages.map((_, page) => (
            <button
              key={page}
              type="button"
              aria-label={`${page + 1} / ${pages.length}`}
              aria-current={page === active ? "true" : undefined}
              onClick={() => show(page)}
              className={cn(
                "focus-ring size-2.5 rounded-full",
                page === active ? "bg-brand-600" : "bg-line hover:bg-ink-faint",
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ReviewCard({
  review,
  locale,
  verifiedLabel,
}: {
  review: RecentReview;
  locale: Locale;
  verifiedLabel: string;
}) {
  const dish = pick(locale, review.itemNameEn, review.itemNameNe);

  return (
    <li className="flex flex-col rounded-card border border-line bg-paper p-5 shadow-card">
      <div className="flex items-center gap-2">
        <Stars rating={review.rating} />
        {review.verified ? (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-herb">
            <BadgeCheck className="size-3.5" aria-hidden />
            {verifiedLabel}
          </span>
        ) : null}
      </div>
      {review.body ? (
        <p className="mt-3 line-clamp-5 leading-relaxed text-ink">{review.body}</p>
      ) : null}
      <p className="mt-auto pt-3 text-sm text-ink-faint">
        {review.authorName}
        {dish ? (
          <>
            {" · "}
            {review.itemSlug ? (
              <Link
                href={`/item/${review.itemSlug}`}
                className="focus-ring rounded font-medium text-brand-700 hover:text-brand-800"
              >
                {dish}
              </Link>
            ) : (
              dish
            )}
          </>
        ) : null}
      </p>
    </li>
  );
}

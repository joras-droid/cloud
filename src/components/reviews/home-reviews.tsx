"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Stars } from "@/components/reviews/review-list";
import type { Locale } from "@/i18n/routing";
import { cn, pick } from "@/lib/utils";
import type { RecentReview } from "@/server/queries/reviews";

const SLIDE_MS = 700;
const INTERVAL_MS = 5500;

export function HomeReviews({
  reviews,
  locale,
}: {
  reviews: RecentReview[];
  locale: Locale;
}) {
  const t = useTranslations("home");
  const item = useTranslations("item");
  const loop = reviews.length > 1;
  const slides = loop ? [...reviews, reviews[0]!] : reviews;

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
    if (!loop || index < reviews.length) return;
    const id = window.setTimeout(() => {
      setAnimate(false);
      setIndex(0);
    }, SLIDE_MS);
    return () => window.clearTimeout(id);
  }, [index, loop, reviews.length]);

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
    show(index >= reviews.length ? 1 : index + 1);
  }

  function prev() {
    if (!loop) return;
    if (index === 0) {
      setAnimate(false);
      setIndex(reviews.length);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setAnimate(true);
          setIndex(reviews.length - 1);
        });
      });
      return;
    }
    show(index - 1);
  }

  const active = index % Math.max(reviews.length, 1);

  return (
    <div
      className="flex flex-col rounded-card border border-line bg-paper p-5 shadow-lifted sm:p-6"
      aria-roledescription={loop ? "carousel" : undefined}
      aria-label={t("reviews")}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-ink">{t("reviews")}</h2>
        {loop ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={prev}
              aria-label={t("previous")}
              className="focus-ring grid size-9 place-items-center rounded-full border border-line bg-paper text-ink hover:bg-brand-50"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label={t("next")}
              className="focus-ring grid size-9 place-items-center rounded-full border border-line bg-paper text-ink hover:bg-brand-50"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>

      {reviews.length === 0 ? (
        <p className="mt-4 text-ink-soft">{item("noReviews")}</p>
      ) : (
        <div className="mt-4 overflow-hidden">
          <ul
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
            {slides.map((review, slideIndex) => (
              <ReviewSlide
                key={`${review.id}-${slideIndex}`}
                review={review}
                locale={locale}
                verifiedLabel={item("verifiedOrder")}
                hidden={slideIndex !== index}
              />
            ))}
          </ul>
        </div>
      )}

      {loop ? (
        <div className="mt-4 flex justify-center gap-2">
          {reviews.map((review, page) => (
            <button
              key={review.id}
              type="button"
              aria-label={`${page + 1} / ${reviews.length}`}
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
    </div>
  );
}

function ReviewSlide({
  review,
  locale,
  verifiedLabel,
  hidden,
}: {
  review: RecentReview;
  locale: Locale;
  verifiedLabel: string;
  hidden: boolean;
}) {
  const dish = pick(locale, review.itemNameEn, review.itemNameNe);

  return (
    <li
      className="w-full shrink-0"
      aria-hidden={hidden}
    >
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
        <p className="mt-3 min-h-[7.5rem] leading-relaxed text-ink">{review.body}</p>
      ) : (
        <p className="mt-3 min-h-[7.5rem]" />
      )}
      <p className="mt-2 text-sm text-ink-faint">
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

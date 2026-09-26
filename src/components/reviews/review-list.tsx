import { BadgeCheck, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PublicReview } from "@/server/queries/reviews";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex" role="img" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn(
            "size-4",
            n <= rating ? "fill-gold text-gold" : "text-line",
          )}
        />
      ))}
    </span>
  );
}

export function ReviewList({
  reviews,
  locale,
}: {
  reviews: PublicReview[];
  locale: Locale;
}) {
  const t = useTranslations("item");

  if (reviews.length === 0) {
    return <p className="text-ink-soft">{t("noReviews")}</p>;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {reviews.map((review) => (
        <li
          key={review.id}
          className="rounded-card border border-line bg-paper p-5 shadow-card"
        >
          <div className="flex items-center gap-2">
            <Stars rating={review.rating} />
            {/* Every review is tied to a delivered order, which is a real
                trust signal an open review form can't offer. */}
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-herb">
              <BadgeCheck className="size-3.5" aria-hidden />
              {t("verifiedOrder")}
            </span>
          </div>

          {review.body ? (
            <p className="mt-3 leading-relaxed text-ink">{review.body}</p>
          ) : null}

          <p className="mt-3 text-sm text-ink-faint">{review.authorName}</p>

          {review.replyEn ? (
            <div className="mt-4 rounded-xl bg-brand-50 p-3">
              <p className="text-xs font-semibold text-brand-700">
                {locale === "ne" ? "घर को स्वाद" : "Ghar Ko Swad"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                {locale === "ne" && review.replyNe
                  ? review.replyNe
                  : review.replyEn}
              </p>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

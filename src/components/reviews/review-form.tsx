"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  submitItemReview,
  type ReviewFormError,
  type ReviewFormState,
} from "@/server/actions/reviews";

function SubmitButton() {
  const t = useTranslations("review");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t("submitting") : t("submit")}
    </Button>
  );
}

export function ReviewForm({ itemId }: { itemId: string }) {
  const t = useTranslations("review");
  const [rating, setRating] = useState(0);
  const [state, action] = useActionState<ReviewFormState, FormData>(
    submitItemReview,
    {},
  );

  if (state.ok) {
    return (
      <p className="mb-8 rounded-card border border-line bg-paper p-5 text-ink">
        {t("thanks")}
      </p>
    );
  }

  const errors: Record<ReviewFormError, string> = {
    invalid: t("invalid"),
    rate_limited: t("rateLimited"),
  };

  return (
    <form
      action={action}
      className="relative mb-8 grid gap-4 rounded-card border border-line bg-paper p-5"
    >
      <div>
        <h3 className="font-display text-lg font-bold text-ink">{t("title")}</h3>
        <p className="mt-1 text-sm text-ink-soft">{t("subtitle")}</p>
      </div>

      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="rating" value={rating || ""} />
      <input
        type="text"
        name="hp"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        defaultValue=""
        className="pointer-events-none absolute -left-[9999px] h-px w-px opacity-0"
      />

      <div>
        <Label id="review-rating-label">{t("rating")}</Label>
        <div
          className="mt-1.5 flex gap-1"
          role="radiogroup"
          aria-labelledby="review-rating-label"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={String(n)}
              onClick={() => setRating(n)}
              className="focus-ring rounded-md p-1"
            >
              <Star
                aria-hidden
                className={cn(
                  "size-6",
                  n <= rating ? "fill-gold text-gold" : "text-line",
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="review-name">{t("name")}</Label>
        <Input
          id="review-name"
          name="authorName"
          required
          maxLength={80}
          autoComplete="name"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="review-body">{t("comment")}</Label>
        <Textarea
          id="review-body"
          name="body"
          maxLength={2000}
          placeholder={t("commentPlaceholder")}
          className="mt-1.5"
        />
      </div>

      <FieldError>{state.error ? errors[state.error] : null}</FieldError>
      <SubmitButton />
    </form>
  );
}

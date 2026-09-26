"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { lookupOrder, type TrackError, type TrackState } from "@/server/actions/track";

function SubmitButton() {
  const t = useTranslations("track");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" block disabled={pending}>
      {pending ? t("submitting") : t("submit")}
    </Button>
  );
}

export function TrackForm({ notice }: { notice?: "empty" }) {
  const t = useTranslations("track");
  const [state, formAction] = useActionState<TrackState, FormData>(lookupOrder, {});

  const errors: Record<TrackError, string> = {
    invalid_phone: t("invalidPhone"),
    not_found: t("notFound"),
    rate_limited: t("rateLimited"),
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-3xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-2 text-sm text-ink-soft">
        {notice === "empty" ? t("emptyBody") : t("subtitle")}
      </p>

      <form
        action={formAction}
        className="mt-8 grid gap-4 rounded-card border border-line bg-paper p-5"
      >
        <div>
          <Label htmlFor="phone">{t("phone")}</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="9800000000"
            required
            className="mt-1.5"
            aria-invalid={state.error ? true : undefined}
          />
          <FieldError>{state.error ? errors[state.error] : null}</FieldError>
        </div>
        <SubmitButton />
      </form>
    </div>
  );
}

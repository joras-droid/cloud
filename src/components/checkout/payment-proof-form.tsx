"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import {
  submitPaymentProof,
  type CheckoutState,
} from "@/server/actions/checkout";
import type { Locale } from "@/i18n/routing";

function Submit() {
  const t = useTranslations("payment");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" block disabled={pending}>
      {pending ? t("uploading") : t("submit")}
    </Button>
  );
}

export function PaymentProofForm({
  orderCode,
  locale,
  returnTo,
  compact,
}: {
  orderCode: string;
  locale: Locale;
  returnTo?: "track" | "done";
  compact?: boolean;
}) {
  const t = useTranslations("payment");
  const [state, action] = useActionState<CheckoutState, FormData>(
    submitPaymentProof,
    {},
  );
  const fileId = `screenshot-${orderCode}`;
  const urlId = `screenshotUrl-${orderCode}`;

  return (
    <form
      action={action}
      className={
        compact
          ? "mt-5 grid gap-3 rounded-xl border border-dashed border-line bg-cream/40 p-4"
          : "grid gap-4 rounded-card border border-line bg-paper p-5"
      }
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="orderCode" value={orderCode} />
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <h2 className="font-display text-lg font-bold">{t("uploadTitle")}</h2>
      <p className="text-sm text-ink-soft">{t("uploadHint")}</p>
      <div>
        <Label htmlFor={fileId}>{t("uploadAction")}</Label>
        <Input
          id={fileId}
          name="screenshot"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="mt-1.5 py-2.5"
        />
      </div>
      <div>
        <Label htmlFor={urlId} hint="optional">
          {t("orUrl")}
        </Label>
        <Input
          id={urlId}
          name="screenshotUrl"
          type="url"
          placeholder="https://…"
          className="mt-1.5"
        />
      </div>
      <FieldError>{state.error}</FieldError>
      <Submit />
    </form>
  );
}

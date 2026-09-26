"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  CUSTOMER_CANCEL_PHONE,
  CUSTOMER_CANCEL_WINDOW_MS,
  canCustomerCancel,
} from "@/lib/order-cancel";
import { telHref } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { cancelOwnOrder, type CancelState } from "@/server/actions/track";

function CancelButton() {
  const t = useTranslations("track");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" block disabled={pending}>
      {pending ? t("cancelling") : t("cancel")}
    </Button>
  );
}

function CallToCancel() {
  const t = useTranslations("track");
  return (
    <div className="mt-5 rounded-xl border border-line bg-cream/60 px-4 py-3">
      <p className="text-sm text-ink-soft">{t("cancelAfter")}</p>
      <a
        href={telHref(CUSTOMER_CANCEL_PHONE)}
        className={cn(buttonVariants({ size: "lg" }), "mt-3 w-full")}
      >
        <Phone className="size-4" aria-hidden />
        {t("cancelCall", { phone: CUSTOMER_CANCEL_PHONE })}
      </a>
    </div>
  );
}

function remainingLabel(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function CancelOrder({
  orderCode,
  placedAt,
  status,
  open,
  remainingMs,
}: {
  orderCode: string;
  placedAt: string;
  status: string;
  open: boolean;
  remainingMs: number;
}) {
  const t = useTranslations("track");
  const placed = new Date(placedAt);
  const [now, setNow] = useState<number | null>(null);
  const [state, action] = useActionState<CancelState, FormData>(cancelOwnOrder, {});

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (status === "cancelled" || status === "delivered") return null;

  const stillOpen =
    state.error !== "too_late" &&
    (now == null ? open : canCustomerCancel(placed, status, now));
  if (!stillOpen) return <CallToCancel />;

  const left =
    now == null ? remainingMs : placed.getTime() + CUSTOMER_CANCEL_WINDOW_MS - now;

  return (
    <form action={action} className="mt-5 rounded-xl border border-line px-4 py-3">
      <input type="hidden" name="orderCode" value={orderCode} />
      <p className="text-sm text-ink-soft">
        {t("cancelLeft", { time: remainingLabel(left) })}
      </p>
      <div className="mt-3">
        <CancelButton />
      </div>
    </form>
  );
}

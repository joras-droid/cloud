"use client";

import { useEffect } from "react";
import Image from "next/image";
import { AlertTriangle, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  useCartStore,
  useCartSubtotal,
  type LiveItem,
} from "@/lib/cart/store";
import { formatPaisa } from "@/lib/money";
import { cn, pick } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

export function CartView({
  liveItems,
  minOrder,
  locale,
}: {
  liveItems: LiveItem[];
  minOrder: number;
  locale: Locale;
}) {
  const t = useTranslations("cart");
  const tCheckout = useTranslations("checkout");

  const lines = useCartStore((s) => s.lines);
  const issues = useCartStore((s) => s.issues);
  const hydrated = useCartStore((s) => s.hydrated);
  const reconcile = useCartStore((s) => s.reconcile);
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);
  const subtotal = useCartSubtotal();

  // A cart can sit overnight. Compare it against the live menu once the store
  // has rehydrated, and surface what changed rather than silently fixing it.
  useEffect(() => {
    if (hydrated) reconcile(liveItems);
  }, [hydrated, reconcile, liveItems]);

  const belowMinimum = subtotal < minOrder;

  if (!hydrated) {
    return <div className="mx-auto max-w-2xl px-4 py-20" aria-busy="true" />;
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center">
        <ShoppingBag className="size-12 text-ink-faint" aria-hidden />
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">
          {t("empty")}
        </h1>
        <Link href="/menu" className={cn(buttonVariants(), "mt-6")}>
          {t("emptyAction")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-ink">
          {t("title")}
        </h1>
        <button
          type="button"
          onClick={clear}
          className="focus-ring rounded-lg px-2 py-1 text-sm text-ink-faint hover:text-chilli"
        >
          {t("clear")}
        </button>
      </div>

      {issues.length > 0 ? (
        <div
          role="status"
          className="mb-5 rounded-card border border-gold/40 bg-gold-soft p-4"
        >
          <p className="flex items-center gap-2 font-medium text-ink">
            <AlertTriangle className="size-4 text-gold" aria-hidden />
            {locale === "ne"
              ? "केही कुरा बदलिएको छ"
              : "A few things changed since you last looked"}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            {issues.map((issue) => (
              <li key={`${issue.type}-${issue.key}`}>
                {issue.type === "price_changed"
                  ? t("priceChanged", {
                      name: pick(locale, issue.nameEn, issue.nameNe),
                      newPrice: formatPaisa(issue.newPrice, locale),
                      oldPrice: formatPaisa(issue.oldPrice, locale),
                    })
                  : t("itemSoldOut", {
                      name: pick(locale, issue.nameEn, issue.nameNe),
                    })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="divide-y divide-line rounded-card border border-line bg-paper">
        {lines.map((line) => (
          <li key={line.key} className="flex gap-3 p-4">
            {line.image ? (
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-line">
                <Image
                  src={line.image}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
            ) : null}

            <div className="min-w-0 flex-1">
              <p className="font-medium leading-tight text-ink">
                {pick(locale, line.nameEn, line.nameNe)}
              </p>

              {line.variantLabelEn || line.modifiers.length > 0 ? (
                <p className="mt-0.5 text-sm text-ink-soft">
                  {[
                    pick(locale, line.variantLabelEn, line.variantLabelNe),
                    ...line.modifiers.map((m) =>
                      pick(locale, m.nameEn, m.nameNe),
                    ),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}

              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center rounded-pill border border-line">
                  <button
                    type="button"
                    onClick={() => decrement(line.key)}
                    aria-label="Decrease quantity"
                    className="focus-ring grid size-8 place-items-center rounded-full hover:bg-brand-50"
                  >
                    <Minus className="size-3.5" aria-hidden />
                  </button>
                  <span className="min-w-7 text-center text-sm font-bold tabular-nums">
                    {line.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => increment(line.key)}
                    aria-label="Increase quantity"
                    className="focus-ring grid size-8 place-items-center rounded-full hover:bg-brand-50"
                  >
                    <Plus className="size-3.5" aria-hidden />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => remove(line.key)}
                  aria-label={`${t("remove")} ${pick(locale, line.nameEn, line.nameNe)}`}
                  className="focus-ring grid size-8 place-items-center rounded-full text-ink-faint hover:bg-chilli-soft hover:text-chilli"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>

                <p className="ml-auto font-semibold text-ink tabular-nums">
                  {formatPaisa(line.unitPrice * line.qty, locale)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-card border border-line bg-paper p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-ink-soft">{t("subtotal")}</span>
          <span className="font-display text-xl font-bold text-ink tabular-nums">
            {formatPaisa(subtotal, locale)}
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-faint">
          {locale === "ne"
            ? "डेलिभरी शुल्क अर्को चरणमा गणना हुन्छ"
            : "Delivery is calculated at the next step"}
        </p>

        {belowMinimum ? (
          <p className="mt-4 rounded-xl bg-chilli-soft p-3 text-sm text-chilli">
            {tCheckout("minOrder", { amount: formatPaisa(minOrder, locale) })}
          </p>
        ) : null}

        {belowMinimum ? (
          <Button size="lg" block disabled className="mt-4">
            {t("checkout")}
          </Button>
        ) : (
          <Link
            href="/checkout"
            className={cn(buttonVariants({ size: "lg", block: true }), "mt-4")}
          >
            {t("checkout")}
          </Link>
        )}
      </div>
    </div>
  );
}

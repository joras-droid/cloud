"use client";

import { Minus, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCartStore } from "@/lib/cart/store";
import { lineKey } from "@/lib/cart/types";
import type { MenuItem } from "@/server/queries/menu";
import type { Locale } from "@/i18n/routing";
import { cn, pick } from "@/lib/utils";

/**
 * The whole add-to-cart interaction: a single button that becomes a stepper in
 * place. No modal, no navigation, no scroll jump, and no network request — the
 * tap only mutates local state, so it lands in well under a frame.
 *
 * Items with a required modifier group are the exception; they open the option
 * sheet instead, because we can't guess a required choice on the customer's
 * behalf.
 */
export function AddButton({
  item,
  onNeedsOptions,
  className,
}: {
  item: MenuItem;
  onNeedsOptions?: () => void;
  className?: string;
}) {
  const t = useTranslations("item");
  const tMenu = useTranslations("menu");
  const locale = useLocale() as Locale;

  const defaultVariant =
    item.variants.find((v) => v.isDefault) ?? item.variants[0] ?? null;
  const requiresChoice =
    item.modifierGroups.some((g) => g.isRequired) || item.variants.length > 1;

  const key = lineKey(item.id, defaultVariant?.id ?? null, []);
  const qty = useCartStore(
    (s) => s.lines.find((l) => l.key === key)?.qty ?? 0,
  );
  const hydrated = useCartStore((s) => s.hydrated);
  const add = useCartStore((s) => s.add);
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);

  const name = pick(locale, item.nameEn, item.nameNe);

  if (item.isSoldOut) {
    return (
      <span
        className={cn(
          "inline-flex h-10 items-center rounded-pill bg-line/60 px-4 text-sm font-medium text-ink-faint",
          className,
        )}
      >
        {tMenu("soldOut")}
      </span>
    );
  }

  if (requiresChoice) {
    return (
      <button
        type="button"
        onClick={onNeedsOptions}
        className={cn(
          "focus-ring inline-flex h-10 items-center gap-1.5 rounded-pill bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700",
          className,
        )}
      >
        <Plus className="size-4" aria-hidden />
        {t("addToCart")}
      </button>
    );
  }

  // Render the neutral state until localStorage has been read, otherwise the
  // server HTML and first client paint disagree.
  if (!hydrated || qty === 0) {
    return (
      <button
        type="button"
        onClick={() =>
          add({
            itemId: item.id,
            slug: item.slug,
            nameEn: item.nameEn,
            nameNe: item.nameNe,
            image: item.image,
            variantId: defaultVariant?.id ?? null,
            variantLabelEn: defaultVariant?.labelEn ?? null,
            variantLabelNe: defaultVariant?.labelNe ?? null,
            modifiers: [],
            unitPrice: item.basePrice + (defaultVariant?.priceDelta ?? 0),
          })
        }
        aria-label={`${t("addToCart")} ${name}`}
        className={cn(
          "focus-ring inline-flex h-10 items-center gap-1.5 rounded-pill bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:scale-95",
          className,
        )}
      >
        <Plus className="size-4" aria-hidden />
        {t("addToCart")}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex h-10 items-center gap-1 rounded-pill bg-brand-600 p-1 text-white",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => decrement(key)}
        aria-label={`Remove one ${name}`}
        className="focus-ring grid size-8 place-items-center rounded-full hover:bg-white/15 active:scale-90"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <span
        aria-live="polite"
        className="min-w-6 text-center text-sm font-bold tabular-nums"
      >
        {qty}
      </span>
      <button
        type="button"
        onClick={() => increment(key)}
        aria-label={`Add one more ${name}`}
        className="focus-ring grid size-8 place-items-center rounded-full hover:bg-white/15 active:scale-90"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

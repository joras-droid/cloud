"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart/store";
import { formatPaisa } from "@/lib/money";
import { cn, pick } from "@/lib/utils";
import type { MenuItem } from "@/server/queries/menu";
import type { Locale } from "@/i18n/routing";

/**
 * Only shown for items that genuinely need a choice. Every required group is
 * pre-selected with its first option, so the common case stays one tap: open,
 * confirm. Making the customer pick a spice level they don't care about is the
 * kind of friction that loses orders.
 */
export function OptionSheet({
  item,
  open,
  onClose,
}: {
  item: MenuItem;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("item");
  const tCart = useTranslations("cart");
  const locale = useLocale() as Locale;
  const add = useCartStore((s) => s.add);

  const [variantId, setVariantId] = useState<string | null>(
    () => (item.variants.find((v) => v.isDefault) ?? item.variants[0])?.id ?? null,
  );
  const [selected, setSelected] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      item.modifierGroups.map((g) => [
        g.id,
        g.isRequired && g.modifiers[0] ? [g.modifiers[0].id] : [],
      ]),
    ),
  );
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const chosenModifiers = useMemo(
    () =>
      item.modifierGroups.flatMap((g) =>
        g.modifiers.filter((m) => selected[g.id]?.includes(m.id)),
      ),
    [item.modifierGroups, selected],
  );

  const variant = item.variants.find((v) => v.id === variantId) ?? null;
  const unitPrice =
    item.basePrice +
    (variant?.priceDelta ?? 0) +
    chosenModifiers.reduce((sum, m) => sum + m.priceDelta, 0);

  const unmetGroup = item.modifierGroups.find(
    (g) => g.isRequired && (selected[g.id]?.length ?? 0) < Math.max(1, g.minSelect),
  );

  if (!open) return null;

  function toggle(groupId: string, modifierId: string, maxSelect: number) {
    setSelected((prev) => {
      const current = prev[groupId] ?? [];
      if (current.includes(modifierId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== modifierId) };
      }
      // Single-select groups swap rather than stack.
      if (maxSelect === 1) return { ...prev, [groupId]: [modifierId] };
      if (current.length >= maxSelect) return prev;
      return { ...prev, [groupId]: [...current, modifierId] };
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label={t("chooseOptions")}
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={pick(locale, item.nameEn, item.nameNe)}
        className="relative flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl bg-paper shadow-lifted sm:rounded-3xl"
      >
        <div className="flex items-start gap-3 border-b border-line p-5">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold text-ink">
              {pick(locale, item.nameEn, item.nameNe)}
            </h2>
            <p className="mt-0.5 text-sm text-ink-soft">
              {formatPaisa(item.basePrice, locale)} {t("chooseOptions")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="focus-ring ml-auto grid size-9 shrink-0 place-items-center rounded-full hover:bg-brand-50"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {item.variants.length > 1 ? (
            <fieldset className="mb-6">
              <legend className="mb-2 text-sm font-semibold text-ink">
                {locale === "ne" ? "आकार" : "Size"}
              </legend>
              <div className="grid gap-2">
                {item.variants.map((v) => (
                  <OptionRow
                    key={v.id}
                    type="radio"
                    name="variant"
                    checked={variantId === v.id}
                    onChange={() => setVariantId(v.id)}
                    label={pick(locale, v.labelEn, v.labelNe)}
                    delta={v.priceDelta}
                    locale={locale}
                  />
                ))}
              </div>
            </fieldset>
          ) : null}

          {item.modifierGroups.map((g) => (
            <fieldset key={g.id} className="mb-6">
              <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                {pick(locale, g.nameEn, g.nameNe)}
                {g.isRequired ? (
                  <span className="rounded-pill bg-chilli-soft px-2 py-0.5 text-[11px] font-medium text-chilli">
                    {t("required")}
                  </span>
                ) : null}
              </legend>
              <div className="grid gap-2">
                {g.modifiers.map((m) => (
                  <OptionRow
                    key={m.id}
                    type={g.maxSelect === 1 ? "radio" : "checkbox"}
                    name={g.id}
                    checked={selected[g.id]?.includes(m.id) ?? false}
                    onChange={() => toggle(g.id, m.id, g.maxSelect)}
                    label={pick(locale, m.nameEn, m.nameNe)}
                    delta={m.priceDelta}
                    locale={locale}
                  />
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex h-12 items-center rounded-xl border border-line">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
              className="focus-ring grid size-11 place-items-center rounded-l-xl text-lg hover:bg-brand-50"
            >
              −
            </button>
            <span className="min-w-8 text-center font-bold tabular-nums">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              aria-label="Increase quantity"
              className="focus-ring grid size-11 place-items-center rounded-r-xl text-lg hover:bg-brand-50"
            >
              +
            </button>
          </div>

          <Button
            size="lg"
            className="flex-1"
            disabled={Boolean(unmetGroup)}
            onClick={() => {
              add(
                {
                  itemId: item.id,
                  slug: item.slug,
                  nameEn: item.nameEn,
                  nameNe: item.nameNe,
                  image: item.image,
                  variantId: variant?.id ?? null,
                  variantLabelEn: variant?.labelEn ?? null,
                  variantLabelNe: variant?.labelNe ?? null,
                  modifiers: chosenModifiers.map((m) => ({
                    id: m.id,
                    nameEn: m.nameEn,
                    nameNe: m.nameNe,
                    priceDelta: m.priceDelta,
                  })),
                  unitPrice,
                },
                qty,
              );
              onClose();
            }}
          >
            {tCart("subtotal")} · {formatPaisa(unitPrice * qty, locale)}
          </Button>
        </div>
      </div>
    </div>
  );
}

function OptionRow({
  type,
  name,
  checked,
  onChange,
  label,
  delta,
  locale,
}: {
  type: "radio" | "checkbox";
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  delta: number;
  locale: Locale;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
        checked
          ? "border-brand-500 bg-brand-50"
          : "border-line hover:bg-brand-50/50",
      )}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        className="size-4 accent-brand-600"
      />
      <span className="text-[15px] text-ink">{label}</span>
      {delta !== 0 ? (
        <span className="ml-auto text-sm font-medium text-ink-soft tabular-nums">
          +{formatPaisa(delta, locale)}
        </span>
      ) : null}
    </label>
  );
}

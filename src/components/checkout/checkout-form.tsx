"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/field";
import {
  computeDeliveryFee,
  FREE_DELIVERY_MIN_SUBTOTAL_PAISA,
} from "@/lib/checkout/delivery-fee";
import { placeOrder, type CheckoutState } from "@/server/actions/checkout";
import { useCartStore, useCartSubtotal } from "@/lib/cart/store";
import { formatPaisa } from "@/lib/money";
import { cn, pick } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import type { CheckoutCity } from "@/server/queries/checkout";

function Submit({
  label,
  disabled,
  className,
}: {
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      block
      disabled={disabled || pending}
      className={className}
    >
      {pending ? "…" : label}
    </Button>
  );
}

export function CheckoutForm({
  cities,
  locale,
  minOrder,
  prepayEnabled,
  codEnabled,
  codMax,
  closed,
}: {
  cities: CheckoutCity[];
  locale: Locale;
  minOrder: number;
  prepayEnabled: boolean;
  codEnabled: boolean;
  codMax: number;
  closed: boolean;
}) {
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const [state, action] = useActionState<CheckoutState, FormData>(placeOrder, {});
  const lines = useCartStore((s) => s.lines);
  const hydrated = useCartStore((s) => s.hydrated);
  const subtotal = useCartSubtotal();

  const kathmandu =
    cities.find((c) => c.nameEn === "Kathmandu") ?? cities[0];
  const [zoneId, setZoneId] = useState(kathmandu?.id ?? "");
  const [payment, setPayment] = useState<"prepay" | "cod">(
    prepayEnabled ? "prepay" : "cod",
  );
  const [callRequested, setCallRequested] = useState<"yes" | "no">("yes");

  const zone = cities.find((c) => c.id === zoneId) ?? kathmandu;
  const zoneFee = zone?.fee ?? 0;
  const deliveryFee = computeDeliveryFee(subtotal, zoneFee);
  const deliveryIsFree = deliveryFee === 0;
  const amountToPay = subtotal;
  const belowMinimum = subtotal < minOrder;
  const codAllowed =
    codEnabled && (zone?.codAllowed ?? true) && amountToPay <= codMax;
  const method: "prepay" | "cod" =
    payment === "cod" && codAllowed
      ? "cod"
      : payment === "prepay" && prepayEnabled
        ? "prepay"
        : prepayEnabled
          ? "prepay"
          : "cod";
  const noPaymentMethod = !prepayEnabled && !codAllowed;

  const cartPayload = useMemo(
    () =>
      JSON.stringify(
        lines.map((l) => ({
          itemId: l.itemId,
          variantId: l.variantId,
          modifiers: l.modifiers.map((m) => ({ id: m.id })),
          qty: l.qty,
        })),
      ),
    [lines],
  );

  if (!hydrated) {
    return <div className="mx-auto max-w-lg px-4 py-16" aria-busy="true" />;
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <ShoppingBag className="size-12 text-ink-faint" aria-hidden />
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">
          {tCart("empty")}
        </h1>
        <Link href="/menu" className={cn(buttonVariants(), "mt-6")}>
          {tCart("emptyAction")}
        </Link>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="mx-auto max-w-lg px-4 pt-6 pb-[calc(9rem+env(safe-area-inset-bottom))]"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="cart" value={cartPayload} />
      <input type="hidden" name="callRequested" value={callRequested} />

      <header>
        <h1 className="font-display text-2xl font-bold text-ink">{t("title")}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t("subtitle")}</p>
      </header>

      {closed ? (
        <p className="mt-4 rounded-xl bg-chilli-soft p-3 text-sm text-chilli">
          {t("closed")}
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 rounded-card border border-line bg-paper p-4 sm:p-5">
        <div>
          <Label htmlFor="phone">{t("phone")}</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            required
            placeholder="98XXXXXXXX"
            className="mt-1.5"
          />
          {subtotal >= FREE_DELIVERY_MIN_SUBTOTAL_PAISA ? (
            <p className="mt-2 text-xs font-medium leading-relaxed text-herb">
              {t("deliveryFreeNotice")}
            </p>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-chilli">
              {t("deliveryRiderNotice")}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="zoneId">{t("city")}</Label>
            <Select
              id="zoneId"
              name="zoneId"
              required
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="mt-1.5"
            >
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {pick(locale, city.nameEn, city.nameNe)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="deliveryAfterHours">{t("deliveryWhen")}</Label>
            <Select
              id="deliveryAfterHours"
              name="deliveryAfterHours"
              required
              defaultValue="0"
              className="mt-1.5"
            >
              <option value="0">{t("deliveryWhenAsap")}</option>
              <option value="1">{t("deliveryWhenAfter1")}</option>
              <option value="2">{t("deliveryWhenAfter2")}</option>
              <option value="3">{t("deliveryWhenAfter3")}</option>
              <option value="4">{t("deliveryWhenAfter4")}</option>
              <option value="5">{t("deliveryWhenAfter5")}</option>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="addressLine">{t("address")}</Label>
          <Textarea
            id="addressLine"
            name="addressLine"
            required
            minLength={4}
            rows={3}
            placeholder={t("addressPlaceholder")}
            className="mt-1.5"
          />
        </div>

        <details className="group rounded-xl border border-dashed border-line/80 px-3 py-2">
          <summary className="cursor-pointer list-none text-sm font-medium text-brand-700 marker:hidden [&::-webkit-details-marker]:hidden">
            {t("showMapLink")}
          </summary>
          <div className="mt-3 pb-1">
            <Label htmlFor="mapUrl" hint={t("optional")}>
              {t("mapLinkShort")}
            </Label>
            <Input
              id="mapUrl"
              name="mapUrl"
              type="url"
              placeholder="https://maps.app.goo.gl/…"
              className="mt-1.5"
            />
          </div>
        </details>
      </div>

      <fieldset className="mt-5 grid gap-2">
        <legend className="sr-only">{t("payment")}</legend>

        {prepayEnabled ? (
          <label
            className={cn(
              "flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5",
              method === "prepay"
                ? "border-brand-500 bg-brand-50"
                : "border-line bg-paper",
            )}
          >
            <input
              type="radio"
              name="payment"
              value="prepay"
              checked={method === "prepay"}
              onChange={() => setPayment("prepay")}
              className="mt-0.5 size-4 shrink-0 accent-brand-600"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{t("payByQr")}</span>
              {method === "prepay" ? (
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {t("payByQrHint")}
                </span>
              ) : null}
            </span>
          </label>
        ) : null}

        {codEnabled ? (
          <label
            className={cn(
              "flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5",
              method === "cod"
                ? "border-brand-500 bg-brand-50"
                : "border-line bg-paper",
              !codAllowed && "opacity-50",
            )}
          >
            <input
              type="radio"
              name="payment"
              value="cod"
              checked={method === "cod"}
              disabled={!codAllowed}
              onChange={() => setPayment("cod")}
              className="mt-0.5 size-4 shrink-0 accent-brand-600"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{t("payCod")}</span>
              {method === "cod" ? (
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {codAllowed
                    ? t("payCodHint")
                    : amountToPay > codMax
                      ? t("codOverLimit", {
                          amount: formatPaisa(codMax, locale),
                        })
                      : t("codUnavailable")}
                </span>
              ) : null}
            </span>
          </label>
        ) : null}

        {noPaymentMethod ? (
          <p className="rounded-xl bg-chilli-soft p-3 text-sm text-chilli">
            {t("noPayment")}
          </p>
        ) : null}

        {method === "prepay" && prepayEnabled ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 pt-1 text-sm">
            <span className="w-full text-xs font-medium text-ink-soft">
              {t("callPref")}
            </span>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="callUi"
                checked={callRequested === "yes"}
                onChange={() => setCallRequested("yes")}
                className="size-4 accent-brand-600"
              />
              {t("callMe")}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="callUi"
                checked={callRequested === "no"}
                onChange={() => setCallRequested("no")}
                className="size-4 accent-brand-600"
              />
              {t("dontCallMe")}
            </label>
          </div>
        ) : method === "cod" && codAllowed ? (
          <p className="px-1 text-xs text-ink-soft">{t("codCallNotice")}</p>
        ) : null}
      </fieldset>

      <div className="mt-4">
        <FieldError>{state.error}</FieldError>
      </div>

      {belowMinimum ? (
        <p className="mt-3 text-sm text-chilli">
          {t("minOrder", { amount: formatPaisa(minOrder, locale) })}
        </p>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-paper/95 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-sm">
        <div className="mx-auto max-w-lg px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <details className="mb-2 text-sm">
            <summary className="cursor-pointer text-ink-soft">{t("orderSummary")}</summary>
            <div className="mt-2 grid gap-1.5 rounded-xl bg-cream/60 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-soft">{tCart("subtotal")}</span>
                <span className="tabular-nums">{formatPaisa(subtotal, locale)}</span>
              </div>
              <p className="text-xs text-ink-soft">{t("deliveryDistanceNote")}</p>
              <div className="flex justify-between gap-3 font-medium">
                <span className="text-ink-soft">{tCart("total")}</span>
                <span className="text-right tabular-nums text-xs sm:text-sm">
                  {deliveryIsFree
                    ? t("totalPlusDeliveryFree", {
                        food: formatPaisa(subtotal, locale),
                      })
                    : t("totalPlusDeliveryValue", {
                        food: formatPaisa(subtotal, locale),
                      })}
                </span>
              </div>
              {!deliveryIsFree ? (
                <p className="text-xs text-ink-soft">{t("deliverySelfPaidBelow")}</p>
              ) : subtotal > 0 ? (
                <p className="text-xs font-medium text-herb">
                  {t("freeDeliveryApplied")}
                </p>
              ) : null}
            </div>
          </details>

          <div className="flex items-end gap-3">
            <div className="min-w-0 shrink-0">
              <p className="text-xs text-ink-faint">{t("amountToPay")}</p>
              <p className="font-display text-xl font-bold tabular-nums text-ink">
                {formatPaisa(amountToPay, locale)}
              </p>
            </div>
            <Submit
              label={t("placeOrder")}
              disabled={closed || belowMinimum || noPaymentMethod}
              className="min-h-12 flex-1"
            />
          </div>
        </div>
      </div>
    </form>
  );
}

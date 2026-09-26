"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/field";
import { placeOrder, type CheckoutState } from "@/server/actions/checkout";
import { useCartStore, useCartSubtotal } from "@/lib/cart/store";
import { formatPaisa } from "@/lib/money";
import { cn, pick } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import type { CheckoutCity } from "@/server/queries/checkout";

function Submit({
  label,
  disabled,
}: {
  label: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" block disabled={disabled || pending}>
      {pending ? "…" : label}
    </Button>
  );
}

export function CheckoutForm({
  cities,
  locale,
  minOrder,
  codEnabled,
  codMax,
  closed,
}: {
  cities: CheckoutCity[];
  locale: Locale;
  minOrder: number;
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
  const [payment, setPayment] = useState<"prepay" | "cod">("prepay");
  const [callRequested, setCallRequested] = useState<"yes" | "no">("yes");

  const zone = cities.find((c) => c.id === zoneId) ?? kathmandu;
  const deliveryFee = zone?.fee ?? 0;
  const total = subtotal + deliveryFee;
  const belowMinimum = subtotal < minOrder;
  const codAllowed =
    codEnabled && (zone?.codAllowed ?? true) && total <= codMax;

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
    return <div className="mx-auto max-w-2xl px-4 py-20" aria-busy="true" />;
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center">
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
    <form action={action} className="mx-auto grid max-w-2xl gap-8 px-4 py-8">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="cart" value={cartPayload} />
      <input type="hidden" name="callRequested" value={callRequested} />

      <h1 className="font-display text-3xl font-bold text-ink">{t("title")}</h1>

      {closed ? (
        <p className="rounded-xl bg-chilli-soft p-4 text-sm text-chilli">
          {t("closed")}
        </p>
      ) : null}

      <section className="grid gap-4 rounded-card border border-line bg-paper p-5">
        <h2 className="font-display text-lg font-bold">{t("contact")}</h2>
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
          <p className="mt-1.5 text-xs text-ink-faint">{t("phoneHint")}</p>
        </div>
      </section>

      <section className="grid gap-4 rounded-card border border-line bg-paper p-5">
        <h2 className="font-display text-lg font-bold">{t("delivery")}</h2>
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
          <Label htmlFor="addressLine">{t("address")}</Label>
          <Textarea
            id="addressLine"
            name="addressLine"
            required
            minLength={4}
            placeholder={t("addressPlaceholder")}
            className="mt-1.5"
          />
          <p className="mt-1.5 text-xs text-ink-faint">{t("addressHint")}</p>
        </div>
        <div>
          <Label htmlFor="mapUrl" hint={t("optional")}>
            {t("mapLink")}
          </Label>
          <Input
            id="mapUrl"
            name="mapUrl"
            type="url"
            placeholder="https://maps.app.goo.gl/…"
            className="mt-1.5"
          />
        </div>
      </section>

      <section className="grid gap-4 rounded-card border border-line bg-paper p-5">
        <h2 className="font-display text-lg font-bold">{t("payment")}</h2>

        <label
          className={cn(
            "flex cursor-pointer gap-3 rounded-xl border p-4",
            payment === "prepay"
              ? "border-brand-500 bg-brand-50"
              : "border-line",
          )}
        >
          <input
            type="radio"
            name="payment"
            value="prepay"
            checked={payment === "prepay"}
            onChange={() => setPayment("prepay")}
            className="mt-1 size-4 accent-brand-600"
          />
          <span>
            <span className="block font-medium">{t("payByQr")}</span>
            <span className="mt-0.5 block text-sm text-ink-soft">
              {t("payByQrHint")}
            </span>
          </span>
        </label>

        <label
          className={cn(
            "flex cursor-pointer gap-3 rounded-xl border p-4",
            payment === "cod" ? "border-brand-500 bg-brand-50" : "border-line",
            !codAllowed && "opacity-50",
          )}
        >
          <input
            type="radio"
            name="payment"
            value="cod"
            checked={payment === "cod"}
            disabled={!codAllowed}
            onChange={() => setPayment("cod")}
            className="mt-1 size-4 accent-brand-600"
          />
          <span>
            <span className="block font-medium">{t("payCod")}</span>
            <span className="mt-0.5 block text-sm text-ink-soft">
              {t("payCodHint")}
            </span>
          </span>
        </label>

        {payment === "prepay" ? (
          <fieldset className="grid gap-2 rounded-xl bg-cream/60 p-4">
            <legend className="px-1 text-sm font-semibold">{t("callPref")}</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="callUi"
                checked={callRequested === "yes"}
                onChange={() => setCallRequested("yes")}
                className="size-4 accent-brand-600"
              />
              {t("callMe")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="callUi"
                checked={callRequested === "no"}
                onChange={() => setCallRequested("no")}
                className="size-4 accent-brand-600"
              />
              {t("dontCallMe")}
            </label>
          </fieldset>
        ) : (
          <p className="rounded-xl bg-gold-soft p-4 text-sm text-ink">
            {t("codCallNotice")}
          </p>
        )}
      </section>

      <section className="grid gap-2 rounded-card border border-line bg-paper p-5">
        <div className="flex justify-between text-sm">
          <span className="text-ink-soft">{tCart("subtotal")}</span>
          <span className="tabular-nums">{formatPaisa(subtotal, locale)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-ink-soft">{tCart("deliveryFee")}</span>
          <span className="tabular-nums">{formatPaisa(deliveryFee, locale)}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>{tCart("total")}</span>
          <span className="tabular-nums">{formatPaisa(total, locale)}</span>
        </div>
        {belowMinimum ? (
          <p className="mt-2 text-sm text-chilli">
            {t("minOrder", { amount: formatPaisa(minOrder, locale) })}
          </p>
        ) : null}
      </section>

      <FieldError>{state.error}</FieldError>

      <Submit label={t("placeOrder")} disabled={closed || belowMinimum} />
    </form>
  );
}

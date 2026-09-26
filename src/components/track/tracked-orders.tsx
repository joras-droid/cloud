import Image from "next/image";
import { Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { CopyText } from "@/components/copy-text";
import { PaymentProofForm } from "@/components/checkout/payment-proof-form";
import { MarkDelivered } from "@/components/track/mark-delivered";
import { RefreshStatus } from "@/components/track/refresh-status";
import { clearTrack } from "@/server/actions/track";
import { qrMethodLabel } from "@/lib/payment-methods";
import { formatPaisa } from "@/lib/money";
import { CUSTOMER_CANCEL_PHONE, CUSTOMER_CANCEL_REASON } from "@/lib/order-cancel";
import { telHref } from "@/lib/phone";
import { cn, pick } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import type { TrackedOrder } from "@/server/queries/track-order";
import type { QrMethod } from "@/server/queries/settings";

const STEPS = ["processing", "waitingRider", "gone"] as const;

function stepIndex(status: TrackedOrder["status"]): number {
  switch (status) {
    case "preparing":
      return 0;
    case "ready":
      return 1;
    case "out_for_delivery":
      return 2;
    case "delivered":
      return 3;
    default:
      return -1;
  }
}

function statusTone(status: TrackedOrder["status"]) {
  if (status === "cancelled" || status === "payment_rejected") return "spice" as const;
  if (status === "pending_confirmation") return "gold" as const;
  if (status === "out_for_delivery" || status === "ready") return "dark" as const;
  if (status === "confirmed" || status === "preparing") return "brand" as const;
  return "neutral" as const;
}

function formatPlaced(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ne" ? "ne-NP" : "en-GB", {
    timeZone: "Asia/Kathmandu",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export async function TrackedOrders({
  orders,
  locale,
  qrImages,
}: {
  orders: TrackedOrder[];
  locale: Locale;
  qrImages: QrMethod[];
}) {
  const t = await getTranslations("track");
  const tOrder = await getTranslations("order");
  const tCart = await getTranslations("cart");
  const tPay = await getTranslations("payment");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex flex-col items-start gap-2 sm:flex-row sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">{t("title")}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t("window")}</p>
        </div>
        <RefreshStatus />
      </div>

      <div className="grid gap-5">
        {orders.map((order) => {
          const current = stepIndex(order.status);
          const riderPhone = order.rider?.phone?.trim() ?? "";
          const rider = riderPhone ? order.rider : null;
          const cancelledByAdmin =
            order.status === "cancelled" &&
            order.cancelledReason !== CUSTOMER_CANCEL_REASON;

          return (
            <article
              key={order.orderCode}
              className={cn(
                "rounded-card border bg-paper p-5",
                cancelledByAdmin ? "border-chilli" : "border-line",
              )}
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-mono text-xl font-bold text-ink">
                    {order.orderCode}
                  </h2>
                  <p className="mt-1 text-sm text-ink-soft">
                    {tOrder("placed", { time: formatPlaced(order.placedAt, locale) })}
                  </p>
                </div>
                <Badge tone={statusTone(order.status)}>
                  {tOrder(`status.${order.status}`)}
                </Badge>
              </header>

              {cancelledByAdmin ? (
                <div className="mt-5 rounded-xl bg-chilli px-4 py-4 text-white">
                  <p className="font-semibold">{t("cancelledByAdmin")}</p>
                </div>
              ) : null}

              {order.status !== "cancelled" ? (
                <ol className="mt-5 grid grid-cols-3 gap-2">
                  {STEPS.map((step, index) => {
                    const reached = current >= index;
                    const currentStep = current === index;
                    return (
                      <li key={step}>
                        <div
                          className={cn(
                            "mb-2 h-1.5 rounded-full transition-colors duration-500",
                            reached ? "bg-brand-600" : "bg-line",
                            currentStep && "animate-pulse",
                          )}
                        />
                        <span
                          className={cn(
                            "block text-xs font-medium transition-colors duration-500",
                            reached ? "text-ink" : "text-ink-faint",
                            currentStep && "font-semibold",
                          )}
                        >
                          {t(`steps.${step}`)}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              ) : null}

              {order.status === "out_for_delivery" ? (
                <MarkDelivered orderCode={order.orderCode} />
              ) : null}

              {rider ? (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                      {tOrder("rider")}
                    </p>
                    {rider.name ? (
                      <p className="mt-0.5 font-medium text-ink">{rider.name}</p>
                    ) : null}
                    <p className="text-sm tabular-nums text-ink-soft">{riderPhone}</p>
                  </div>
                  <a
                    href={telHref(riderPhone)}
                    className={cn(buttonVariants({ size: "sm" }))}
                  >
                    <Phone className="size-4" aria-hidden />
                    {tOrder("callRider")}
                  </a>
                </div>
              ) : null}

              <h3 className="mt-6 font-display text-lg font-bold">{tOrder("items")}</h3>
              <ul className="mt-2 divide-y divide-line">
                {order.items.map((item) => {
                  const detail = [
                    item.variant
                      ? pick(locale, item.variant.labelEn, item.variant.labelNe)
                      : null,
                    ...item.modifiers.map((modifier) =>
                      pick(locale, modifier.nameEn, modifier.nameNe),
                    ),
                  ]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <li key={item.id} className="flex justify-between gap-3 py-3">
                      <div>
                        <p className="font-medium">
                          {item.qty}× {pick(locale, item.nameEn, item.nameNe)}
                        </p>
                        {detail ? (
                          <p className="text-sm text-ink-soft">{detail}</p>
                        ) : null}
                      </div>
                      <p className="tabular-nums">{formatPaisa(item.lineTotal, locale)}</p>
                    </li>
                  );
                })}
              </ul>

              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-soft">{tCart("subtotal")}</dt>
                  <dd className="tabular-nums">{formatPaisa(order.subtotal, locale)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-soft">{tCart("deliveryFee")}</dt>
                  <dd className="tabular-nums">
                    {formatPaisa(order.deliveryFee, locale)}
                  </dd>
                </div>
                {order.discount > 0 ? (
                  <div className="flex justify-between">
                    <dt className="text-ink-soft">{t("discount")}</dt>
                    <dd className="tabular-nums">
                      −{formatPaisa(order.discount, locale)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between font-semibold text-ink">
                  <dt>{tCart("total")}</dt>
                  <dd className="tabular-nums">{formatPaisa(order.total, locale)}</dd>
                </div>
              </dl>

              <h3 className="mt-6 font-display text-lg font-bold">{t("deliverTo")}</h3>
              <div className="mt-3 grid gap-3">
                <div className="flex flex-col gap-3 rounded-xl border border-line px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      {t("phone")}
                    </p>
                    <p className="mt-0.5 font-medium tabular-nums">{order.phone}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <a
                      href={telHref(order.phone)}
                      className={cn(buttonVariants({ size: "sm" }))}
                    >
                      <Phone className="size-4" aria-hidden />
                      {t("call")}
                    </a>
                    <CopyText
                      value={order.phone}
                      label={t("copyPhone")}
                      copyLabel={t("copy")}
                      copiedLabel={t("copied")}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-3 rounded-xl border border-line px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      {t("deliverTo")}
                    </p>
                    <p className="mt-0.5 font-medium">{order.addressLine}</p>
                    {order.landmark ? (
                      <p className="text-sm text-ink-soft">{order.landmark}</p>
                    ) : null}
                    <p className="text-sm text-ink-soft">
                      {pick(locale, order.zoneNameEn, order.zoneNameNe)}
                    </p>
                  </div>
                  <CopyText
                    value={[
                      order.addressLine,
                      order.landmark,
                      pick(locale, order.zoneNameEn, order.zoneNameNe),
                    ]
                      .filter(Boolean)
                      .join(", ")}
                    label={t("copyLocation")}
                    copyLabel={t("copy")}
                    copiedLabel={t("copied")}
                  />
                </div>
              </div>

              {order.paymentMethod !== "cod" &&
              (order.status === "pending_payment" ||
                order.status === "payment_rejected") ? (
                <div className="mt-6">
                  <h3 className="font-display text-lg font-bold">
                    {t("uploadPayment")}
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    {tPay("remarkInstruction", { code: order.orderCode })}
                  </p>
                  {qrImages.length > 0 ? (
                    <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                      {qrImages.map((qr) => (
                        <li
                          key={`${order.orderCode}-${qr.method}`}
                          className="overflow-hidden rounded-xl border border-line bg-cream/40 p-3"
                        >
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                            {qrMethodLabel(qr.method)}
                          </p>
                          {qr.image ? (
                            <div className="relative aspect-square overflow-hidden rounded-lg bg-paper">
                              <Image
                                src={qr.image}
                                alt={`${qrMethodLabel(qr.method)} QR`}
                                fill
                                unoptimized
                                className="object-contain"
                                sizes="200px"
                              />
                            </div>
                          ) : null}
                          <p className="mt-2 text-sm text-ink-soft">{qr.accountName}</p>
                          {qr.note ? (
                            <p className="mt-1 text-sm text-ink-soft">{qr.note}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <PaymentProofForm
                    orderCode={order.orderCode}
                    locale={locale}
                    returnTo="track"
                    compact
                  />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="mt-8 grid gap-3">
        <a
          href={telHref(CUSTOMER_CANCEL_PHONE)}
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          <Phone className="size-4" aria-hidden />
          {t("callKitchen")}
        </a>
        <form action={clearTrack} className="text-center">
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit" variant="ghost" size="sm">
            {t("differentNumber")}
          </Button>
        </form>
      </div>
    </div>
  );
}

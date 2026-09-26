import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { ClearCartOnDone } from "@/components/checkout/clear-cart-on-done";
import { getOrderByCode } from "@/server/queries/checkout";
import { formatPaisa } from "@/lib/money";
import { cn, pick } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("doneTitle"), robots: { index: false } };
}

export default async function CheckoutDonePage({
  params,
}: {
  params: Promise<{ locale: Locale; code: string }>;
}) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  const order = await getOrderByCode(code.toUpperCase());
  if (!order) notFound();

  const t = await getTranslations("checkout");
  const tCart = await getTranslations("cart");
  const isCod = order.paymentMethod === "cod";
  const deliveryWhenKey =
    (
      [
        "deliveryWhenAsap",
        "deliveryWhenAfter1",
        "deliveryWhenAfter2",
        "deliveryWhenAfter3",
        "deliveryWhenAfter4",
        "deliveryWhenAfter5",
      ] as const
    )[order.deliveryAfterHours] ?? "deliveryWhenAsap";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <ClearCartOnDone />
      <div className="rounded-card border border-line bg-paper p-6 text-center sm:p-10">
        <CheckCircle2 className="mx-auto size-12 text-herb" aria-hidden />
        <h1 className="mt-4 font-display text-3xl font-bold text-ink">
          {t("doneTitle")}
        </h1>
        <p className="mt-2 font-mono text-xl font-bold text-brand-700">
          {order.orderCode}
        </p>
        <p className="mt-4 text-ink-soft">
          {isCod
            ? t("doneCod")
            : order.callRequested
              ? t("donePrepayCall")
              : t("donePrepayNoCall")}
        </p>

        {isCod ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold-soft px-4 py-3 text-sm font-medium text-ink">
            <Phone className="size-4" aria-hidden />
            {t("codCallNotice")}
          </p>
        ) : null}

        <dl className="mt-8 grid gap-2 text-left text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">{t("city")}</dt>
            <dd>{pick(locale, order.zoneEn, order.zoneNe)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">{t("address")}</dt>
            <dd className="text-right">{order.addressLine}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">{t("deliveryWhen")}</dt>
            <dd className="text-right">{t(deliveryWhenKey)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">{tCart("total")}</dt>
            <dd className="font-semibold tabular-nums">
              {formatPaisa(order.total, locale)}
            </dd>
          </div>
        </dl>

        <Link
          href="/track"
          className={cn(buttonVariants({ size: "lg" }), "mt-8")}
        >
          {t("trackOrder")}
        </Link>
      </div>
    </div>
  );
}

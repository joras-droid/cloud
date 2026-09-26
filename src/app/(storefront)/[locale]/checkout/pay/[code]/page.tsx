import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PaymentProofForm } from "@/components/checkout/payment-proof-form";
import { getOrderByCode } from "@/server/queries/checkout";
import { getStoreSettings } from "@/server/queries/settings";
import { qrMethodLabel } from "@/lib/payment-methods";
import { formatPaisa } from "@/lib/money";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "payment" });
  return { title: t("scanQr"), robots: { index: false } };
}

export default async function CheckoutPayPage({
  params,
}: {
  params: Promise<{ locale: Locale; code: string }>;
}) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  const [order, settings] = await Promise.all([
    getOrderByCode(code.toUpperCase()),
    getStoreSettings(),
  ]);
  if (!order || order.paymentMethod === "cod") notFound();

  const t = await getTranslations("payment");
  const alreadySubmitted =
    order.status === "payment_submitted" ||
    order.status === "confirmed" ||
    order.status === "preparing";

  return (
    <div className="mx-auto grid max-w-2xl gap-6 px-4 py-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          {t("orderCode")}
        </p>
        <h1 className="mt-1 font-mono text-3xl font-bold text-ink">
          {order.orderCode}
        </h1>
        <p className="mt-2 text-ink-soft">
          {t("remarkInstruction", { code: order.orderCode })}
        </p>
        <p className="mt-3 font-display text-2xl font-bold tabular-nums">
          {t("title", { amount: formatPaisa(order.total, locale) })}
        </p>
      </header>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">{t("scanQr")}</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {settings.qrImages.map((qr) => (
            <li
              key={qr.method}
              className="overflow-hidden rounded-card border border-line bg-paper p-4"
            >
              <p className="mb-2 text-sm font-semibold">{qrMethodLabel(qr.method)}</p>
              {qr.image ? (
                <div className="relative aspect-square overflow-hidden rounded-xl bg-line">
                  <Image
                    src={qr.image}
                    alt={`${qrMethodLabel(qr.method)} QR`}
                    fill
                    unoptimized
                    className="object-contain"
                    sizes="280px"
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
      </section>

      {alreadySubmitted ? (
        <p className="rounded-xl bg-herb-soft p-4 text-sm">{t("submitted")}</p>
      ) : (
        <PaymentProofForm orderCode={order.orderCode} locale={locale} />
      )}
    </div>
  );
}

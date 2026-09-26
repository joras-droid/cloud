import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TrackForm } from "@/components/track/track-form";
import { TrackedOrders } from "@/components/track/tracked-orders";
import type { Locale } from "@/i18n/routing";
import { normalizeNepalPhone } from "@/lib/phone";
import { getStoreSettings } from "@/server/queries/settings";
import { getTrackableOrders } from "@/server/queries/track-order";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; phone: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "track" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function TrackByPhonePage({
  params,
}: {
  params: Promise<{ locale: Locale; phone: string }>;
}) {
  const { locale, phone: raw } = await params;
  setRequestLocale(locale);

  const phone = normalizeNepalPhone(decodeURIComponent(raw));
  const orders = phone ? await getTrackableOrders(phone) : [];

  if (!phone || orders.length === 0) {
    return <TrackForm notice={phone ? "empty" : undefined} />;
  }

  const settings = await getStoreSettings();
  return (
    <TrackedOrders
      orders={orders}
      locale={locale}
      qrImages={settings.qrImages}
    />
  );
}

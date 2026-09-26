import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getCheckoutCities } from "@/server/queries/checkout";
import { getStoreSettings } from "@/server/queries/settings";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("title"), robots: { index: false } };
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [cities, settings] = await Promise.all([
    getCheckoutCities(),
    getStoreSettings(),
  ]);

  return (
    <CheckoutForm
      cities={cities}
      locale={locale}
      minOrder={settings.minOrder}
      codEnabled={settings.codEnabled}
      codMax={settings.codMax}
      closed={!settings.isAcceptingOrders}
    />
  );
}

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CartView } from "@/components/cart/cart-view";
import { getMenu } from "@/server/queries/menu";
import { getStoreSettings } from "@/server/queries/settings";
import type { LiveItem } from "@/lib/cart/store";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cart" });
  return { title: t("title"), robots: { index: false } };
}

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [menu, settings] = await Promise.all([getMenu(), getStoreSettings()]);

  // Live prices go down with the page so the client can reconcile a cart that
  // has been sitting in localStorage without an extra round-trip.
  const liveItems: LiveItem[] = menu
    .flatMap((c) => c.items)
    .map((item) => ({
      id: item.id,
      basePrice: item.basePrice,
      isSoldOut: item.isSoldOut,
      variants: item.variants.map((v) => ({
        id: v.id,
        priceDelta: v.priceDelta,
      })),
      modifiers: Object.fromEntries(
        item.modifierGroups.flatMap((g) =>
          g.modifiers.map((m) => [m.id, m.priceDelta] as const),
        ),
      ),
    }));

  return (
    <CartView
      liveItems={liveItems}
      minOrder={settings.minOrder}
      locale={locale}
    />
  );
}

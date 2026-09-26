import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Inter, Fraunces, Noto_Sans_Devanagari } from "next/font/google";
import { routing, type Locale } from "@/i18n/routing";
import { SiteHeader } from "@/components/site-header";
import { VegBackdrop } from "@/components/veg-backdrop";
import { SiteFooter } from "@/components/site-footer";
import { CartBar } from "@/components/cart/cart-bar";
import { getStoreSettings } from "@/server/queries/settings";
import "@/app/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["600", "700"],
});

/**
 * Loaded with the devanagari subset only, so the `unicode-range` on the
 * generated @font-face keeps English visitors from downloading any of it.
 */
const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-deva",
  display: "swap",
  weight: ["400", "500", "600"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "brand" });
  return {
    title: { default: t("name"), template: `%s · ${t("name")}` },
    description: t("tagline"),
    alternates: {
      canonical: "/",
      languages: { en: "/", ne: "/ne" },
    },
  };
}

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const settings = await getStoreSettings();

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${fraunces.variable} ${devanagari.variable} h-full`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <VegBackdrop />
        <NextIntlClientProvider>
          <div className="relative z-10 flex min-h-full flex-1 flex-col">
            <SiteHeader
              banner={locale === "ne" ? settings.bannerNe : settings.bannerEn}
            />
            <main className="flex-1">{children}</main>
            <SiteFooter supportPhone={settings.supportPhone} />
            <CartBar />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OfficeInquiryForm } from "@/components/office/inquiry-form";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getStoreSettings } from "@/server/queries/settings";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "office" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function OfficesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("office");
  const settings = await getStoreSettings();

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Link
        href="/menu"
        className="focus-ring rounded text-sm font-medium text-ink-soft hover:text-ink"
      >
        {t("backToMenu")}
      </Link>
      <header className="mt-4 mb-8">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-ink-soft">{t("subtitle")}</p>
      </header>
      <OfficeInquiryForm supportPhone={settings.supportPhone} />
    </div>
  );
}

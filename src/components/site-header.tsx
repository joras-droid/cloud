import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitch } from "./language-switch";
import { CartButton } from "./cart/cart-button";

export function SiteHeader({ banner }: { banner?: string | null }) {
  const t = useTranslations("nav");
  const brand = useTranslations("brand");
  const locale = useLocale();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur-md">
      {banner ? (
        <p className="bg-ink px-4 py-1.5 text-center text-xs font-medium text-cream">
          {banner}
        </p>
      ) : null}

      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link
          href="/"
          className="focus-ring rounded-lg font-display text-xl font-bold text-brand-700"
        >
          {brand("name")}
        </Link>

        <nav className="ml-auto hidden items-center gap-1 sm:flex">
          <Link
            href="/menu"
            className="focus-ring rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink"
          >
            {t("menu")}
          </Link>
          <Link
            href="/story"
            className="focus-ring rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink"
          >
            {t("story")}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <LanguageSwitch current={locale} />
          <CartButton />
        </div>
      </div>
    </header>
  );
}

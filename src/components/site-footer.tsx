import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function SiteFooter({ supportPhone }: { supportPhone?: string | null }) {
  const t = useTranslations("nav");
  const brand = useTranslations("brand");

  return (
    // Bottom padding clears the sticky cart bar on mobile.
    <footer className="mt-20 border-t border-line bg-paper pb-28 sm:pb-0">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-lg font-bold text-brand-700">
            {brand("name")}
          </p>
          <p className="mt-1 max-w-xs text-sm text-ink-soft">
            {brand("tagline")}
          </p>
        </div>

        <nav className="flex flex-col gap-2 text-sm">
          <Link href="/menu" className="focus-ring rounded text-ink-soft hover:text-ink">
            {t("menu")}
          </Link>
          <Link href="/story" className="focus-ring rounded text-ink-soft hover:text-ink">
            {t("story")}
          </Link>
          <Link href="/track" className="focus-ring rounded text-ink-soft hover:text-ink">
            {t("trackOrder")}
          </Link>
        </nav>

        {supportPhone ? (
          <a
            href={`tel:${supportPhone}`}
            className="focus-ring rounded text-sm font-medium text-ink"
          >
            {supportPhone}
          </a>
        ) : null}
      </div>
    </footer>
  );
}

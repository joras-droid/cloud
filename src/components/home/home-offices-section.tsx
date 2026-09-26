import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { OfficesCtaLink } from "@/components/office/offices-cta-link";

export async function HomeOfficesSection() {
  const t = await getTranslations("home");

  return (
    <section className="border-y border-gold/30 bg-gradient-to-br from-gold-soft via-paper to-brand-50/80">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
            {t("officesTitle")}
          </p>
          <p className="mt-2 max-w-xl text-lg leading-relaxed text-ink">{t("officesLead")}</p>
          <ul className="mt-5 space-y-2.5 text-ink-soft">
            <li className="flex gap-2">
              <Check className="mt-0.5 size-5 shrink-0 text-herb" aria-hidden />
              <span>{t("officesDaily")}</span>
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 size-5 shrink-0 text-herb" aria-hidden />
              <span>{t("officesLunch")}</span>
            </li>
          </ul>
        </div>
        <OfficesCtaLink size="lg" className="w-full shrink-0 lg:w-auto">
          {t("officesCta")}
        </OfficesCtaLink>
      </div>
    </section>
  );
}

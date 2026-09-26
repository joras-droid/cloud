import Image from "next/image";
import { Flame, Leaf } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatPaisa } from "@/lib/money";
import { pick } from "@/lib/utils";
import type { MenuItem } from "@/server/queries/menu";
import type { Locale } from "@/i18n/routing";
import { ItemActions } from "./item-actions";

export function ItemCard({
  item,
  priority = false,
}: {
  item: MenuItem;
  priority?: boolean;
}) {
  const t = useTranslations("menu");
  const locale = useLocale() as Locale;
  const name = pick(locale, item.nameEn, item.nameNe);
  const desc = pick(locale, item.descEn, item.descNe);

  return (
    <article className="group relative flex gap-4 rounded-card border border-line bg-paper p-3 shadow-card transition-shadow hover:shadow-lifted sm:flex-col sm:p-0">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-line sm:aspect-[4/3] sm:size-auto sm:w-full sm:rounded-b-none sm:rounded-t-card">
        {item.image ? (
          <Image
            src={item.image}
            alt={pick(locale, item.imageAltEn, item.imageAltNe) || name}
            fill
            // Explicit sizes keeps the browser from fetching a 1200px file for
            // a 96px thumbnail on mobile.
            sizes="(max-width: 640px) 96px, (max-width: 1024px) 45vw, 30vw"
            priority={priority}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
        {item.isSoldOut ? (
          <div className="absolute inset-0 grid place-items-center bg-ink/55">
            <span className="rounded-pill bg-paper px-3 py-1 text-xs font-semibold text-ink">
              {t("soldOut")}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col sm:p-4">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 font-display text-[17px] font-bold leading-tight text-ink">
            <Link href={`/item/${item.slug}`} className="focus-ring rounded">
              {/* Stretches the link over the whole card without nesting the
                  add button inside an anchor. */}
              <span className="absolute inset-0 sm:rounded-card" />
              {name}
            </Link>
          </h3>
          {item.isVeg ? (
            <Leaf
              className="mt-0.5 size-4 shrink-0 text-herb"
              aria-label="Vegetarian"
            />
          ) : null}
          {item.spiceLevel >= 3 ? (
            <Flame
              className="mt-0.5 size-4 shrink-0 text-chilli"
              aria-label={t("spice")}
            />
          ) : null}
        </div>

        {desc ? (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-soft">
            {desc}
          </p>
        ) : null}

        <div className="mt-auto flex items-center gap-3 pt-3">
          <p className="font-semibold text-ink tabular-nums">
            {item.variants.length > 1 ? (
              <span className="mr-1 text-xs font-normal text-ink-faint">
                {t("from")}
              </span>
            ) : null}
            {formatPaisa(item.basePrice, locale)}
          </p>
          <span className="text-xs text-ink-faint">
            {t("prepTime", { minutes: item.prepMinutes })}
          </span>
          {/* Sits above the stretched link so taps hit the button. */}
          <ItemActions item={item} className="relative z-10 ml-auto" />
        </div>
      </div>
    </article>
  );
}

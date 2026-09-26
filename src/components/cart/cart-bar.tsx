"use client";

import { ShoppingBag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useCartCount, useCartStore, useCartSubtotal } from "@/lib/cart/store";
import { formatPaisa } from "@/lib/money";
import type { Locale } from "@/i18n/routing";

/**
 * Appears on first add and is the only persistent chrome on the storefront.
 * Hidden on cart and checkout, where it would duplicate the page's own totals.
 */
export function CartBar() {
  const t = useTranslations("cart");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const count = useCartCount();
  const subtotal = useCartSubtotal();
  const hydrated = useCartStore((s) => s.hydrated);

  const hiddenOn = ["/cart", "/checkout", "/checkout/payment"];
  if (!hydrated || count === 0 || hiddenOn.some((p) => pathname.startsWith(p)))
    return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <Link
        href="/cart"
        className="focus-ring mx-auto flex h-14 max-w-md items-center gap-3 rounded-pill bg-ink px-5 text-cream shadow-lifted transition-transform active:scale-[0.98]"
      >
        <ShoppingBag className="size-5 shrink-0" aria-hidden />
        <span className="text-sm font-medium">{t("items", { count })}</span>
        <span aria-hidden className="text-cream/40">
          ·
        </span>
        <span className="text-sm font-bold tabular-nums">
          {formatPaisa(subtotal, locale)}
        </span>
        <span className="ml-auto text-sm font-semibold">{t("viewCart")}</span>
      </Link>
    </div>
  );
}

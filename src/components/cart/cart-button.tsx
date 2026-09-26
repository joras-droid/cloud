"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCartCount, useCartStore } from "@/lib/cart/store";

export function CartButton() {
  const t = useTranslations("nav");
  const count = useCartCount();
  const hydrated = useCartStore((s) => s.hydrated);

  return (
    <Link
      href="/cart"
      aria-label={t("cart")}
      className="focus-ring relative grid size-10 place-items-center rounded-full border border-line bg-paper text-ink hover:bg-brand-50"
    >
      <ShoppingBag className="size-[18px]" aria-hidden />
      {hydrated && count > 0 ? (
        <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white tabular-nums">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

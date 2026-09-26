"use client";

import { useParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LABEL: Record<string, string> = { en: "EN", ne: "ने" };

/**
 * Switches locale while staying on the current page — sending people back to
 * the homepage to read the same dish in Nepali is a small betrayal.
 */
export function LanguageSwitch({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, startTransition] = useTransition();

  return (
    <div
      className="flex rounded-pill border border-line bg-paper p-0.5"
      role="group"
      aria-label="Language"
    >
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          disabled={pending}
          aria-current={locale === current ? "true" : undefined}
          onClick={() =>
            startTransition(() => {
              router.replace(
                // @ts-expect-error -- pathname is a known route, params carry
                // any dynamic segments for the current page.
                { pathname, params },
                { locale },
              );
            })
          }
          className={cn(
            "focus-ring rounded-pill px-2.5 py-1 text-xs font-semibold transition-colors",
            locale === current
              ? "bg-ink text-cream"
              : "text-ink-soft hover:text-ink",
          )}
        >
          {LABEL[locale]}
        </button>
      ))}
    </div>
  );
}

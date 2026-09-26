"use client";

import { useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

const REFRESH_MS = 3 * 60 * 1000;

export function RefreshStatus() {
  const t = useTranslations("track");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return;
      startTransition(() => router.refresh());
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [router]);

  return (
    <button
      type="button"
      className="focus-ring rounded-lg px-2 py-1 text-sm font-medium text-brand-700 hover:text-brand-800 disabled:opacity-50"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? t("refreshing") : t("refresh")}
    </button>
  );
}

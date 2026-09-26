import { defineRouting } from "next-intl/routing";

export const locales = ["en", "ne"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  // English stays at /menu, Nepali lives at /ne/menu. Keeps the canonical
  // English URLs short and avoids a redirect on the most-trafficked paths.
  localePrefix: "as-needed",
});

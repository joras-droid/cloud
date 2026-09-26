/**
 * Money is integer paisa everywhere. Floats and currency do not mix: 0.1 + 0.2
 * is the kind of bug that shows up as a one-paisa mismatch on a bank reconcile.
 */
export type Paisa = number;

export const rupeesToPaisa = (rupees: number): Paisa => Math.round(rupees * 100);
export const paisaToRupees = (paisa: Paisa): number => paisa / 100;

/**
 * Western digits in both locales, deliberately. Devanagari numerals on a price
 * invite misreading at the exact moment money changes hands; we localise the
 * currency label instead.
 */
export function formatPaisa(paisa: Paisa, locale: "en" | "ne" = "en"): string {
  const rupees = paisa / 100;
  const label = locale === "ne" ? "रु" : "Rs";
  const hasPaisa = paisa % 100 !== 0;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: hasPaisa ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rupees);
  return `${label} ${formatted}`;
}

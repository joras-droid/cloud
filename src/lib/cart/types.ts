export type CartModifier = {
  id: string;
  nameEn: string;
  nameNe: string | null;
  priceDelta: number;
};

export type CartLine = {
  /** Stable key for an item + variant + modifier combination. */
  key: string;
  itemId: string;
  slug: string;
  nameEn: string;
  nameNe: string | null;
  image: string | null;
  variantId: string | null;
  variantLabelEn: string | null;
  variantLabelNe: string | null;
  modifiers: CartModifier[];
  /**
   * What the customer was shown when they added the line. Displayed totals use
   * this; the authoritative total is always recomputed server-side at checkout.
   */
  unitPrice: number;
  qty: number;
};

export type CartIssue =
  | { type: "price_changed"; key: string; nameEn: string; nameNe: string | null; oldPrice: number; newPrice: number }
  | { type: "sold_out"; key: string; nameEn: string; nameNe: string | null }
  | { type: "removed"; key: string; nameEn: string; nameNe: string | null };

export function lineKey(
  itemId: string,
  variantId: string | null,
  modifierIds: string[],
): string {
  return [itemId, variantId ?? "-", [...modifierIds].sort().join(".")].join("|");
}

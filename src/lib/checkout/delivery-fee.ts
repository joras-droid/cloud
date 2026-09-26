/** Food subtotal at or above this (paisa) gets free delivery. Rs 1,000. */
export const FREE_DELIVERY_MIN_SUBTOTAL_PAISA = 100_000;

export function computeDeliveryFee(
  subtotalPaisa: number,
  zoneFeePaisa: number,
): number {
  if (subtotalPaisa >= FREE_DELIVERY_MIN_SUBTOTAL_PAISA) return 0;
  return zoneFeePaisa;
}

export function freeDeliveryRemainingPaisa(subtotalPaisa: number): number {
  if (subtotalPaisa >= FREE_DELIVERY_MIN_SUBTOTAL_PAISA) return 0;
  return FREE_DELIVERY_MIN_SUBTOTAL_PAISA - subtotalPaisa;
}

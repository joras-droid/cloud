/** Hours after order time the customer wants delivery. 0 = as soon as possible. */
export const DELIVERY_AFTER_HOURS_OPTIONS = [0, 1, 2, 3, 4, 5] as const;

export type DeliveryAfterHours = (typeof DELIVERY_AFTER_HOURS_OPTIONS)[number];

export function parseDeliveryAfterHours(raw: string): DeliveryAfterHours | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 5) return null;
  return n as DeliveryAfterHours;
}

/** Short label for tight admin chips (English). */
export function deliveryAfterHoursShort(hours: number): string {
  if (hours === 0) return "ASAP";
  if (hours === 1) return "After 1 hr";
  return `After ${hours} hrs`;
}

/** Short label for admin and logs (English). */
export function deliveryAfterHoursLabel(hours: number): string {
  if (hours === 0) return "As soon as possible";
  if (hours === 1) return "After 1 hour";
  return `After ${hours} hours`;
}

/** Customers may cancel in the app only during this window after the order is placed. */
export const CUSTOMER_CANCEL_WINDOW_MS = 3 * 60 * 1000;

/** After the window, cancellation is a phone call. */
export const CUSTOMER_CANCEL_PHONE = "9847104744";

/** Stored on the order when the customer cancels themselves. */
export const CUSTOMER_CANCEL_REASON = "Cancelled by customer";

const LOCKED = new Set(["delivered", "cancelled", "out_for_delivery"]);

export function canCustomerCancel(
  placedAt: Date,
  status: string,
  now = Date.now(),
): boolean {
  if (LOCKED.has(status)) return false;
  return now - placedAt.getTime() < CUSTOMER_CANCEL_WINDOW_MS;
}

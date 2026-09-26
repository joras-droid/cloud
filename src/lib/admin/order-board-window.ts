/** Delivered orders stay on the admin board this long, then drop off the list. */
export const DELIVERED_BOARD_VISIBLE_MS = 18 * 60 * 60 * 1000;

export function deliveredBoardVisibleSince(now = Date.now()): Date {
  return new Date(now - DELIVERED_BOARD_VISIBLE_MS);
}

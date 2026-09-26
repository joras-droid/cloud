import type { BoardOrder } from "@/lib/admin/order-board-types";

export type OrderGroup = {
  key: string;
  customerName: string;
  customerPhone: string;
  addressLine: string;
  zone: string;
  /** Newest order in the group — used for queue sorting. */
  placedAt: string;
  deliveryAfterHours: number;
  orders: BoardOrder[];
  totalCombined: number;
  itemCountCombined: number;
};

/** Kitchen list: active work first, then on the way, delivered last. */
export function queueTier(status: BoardOrder["status"]): number {
  if (status === "delivered") return 2;
  if (status === "out_for_delivery") return 1;
  return 0;
}

function compareOrdersForQueue(a: BoardOrder, b: BoardOrder): number {
  const tierA = queueTier(a.status);
  const tierB = queueTier(b.status);
  if (tierA !== tierB) return tierA - tierB;
  return new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime();
}

/** Newest active orders on top; delivered at the bottom. */
export function sortOrdersForQueue(orders: BoardOrder[]): BoardOrder[] {
  return [...orders].sort(compareOrdersForQueue);
}

function compareGroups(a: OrderGroup, b: OrderGroup): number {
  const tierA = Math.min(...a.orders.map((o) => queueTier(o.status)));
  const tierB = Math.min(...b.orders.map((o) => queueTier(o.status)));
  if (tierA !== tierB) return tierA - tierB;
  const newestA = Math.max(...a.orders.map((o) => new Date(o.placedAt).getTime()));
  const newestB = Math.max(...b.orders.map((o) => new Date(o.placedAt).getTime()));
  return newestB - newestA;
}

export function deliveryGroupKey(order: Pick<BoardOrder, "customerPhone" | "addressLine">): string {
  return `${order.customerPhone}::${order.addressLine.trim().toLowerCase()}`;
}

export function groupOrdersByDelivery(orders: BoardOrder[]): OrderGroup[] {
  const byKey = new Map<string, BoardOrder[]>();

  for (const order of orders) {
    const key = deliveryGroupKey(order);
    const list = byKey.get(key) ?? [];
    list.push(order);
    byKey.set(key, list);
  }

  const groups: OrderGroup[] = [];

  for (const [key, list] of byKey) {
    const sorted = [...list].sort(
      (a, b) => new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime(),
    );
    const first = sorted[0]!;
    const newest = sorted[sorted.length - 1]!;
    groups.push({
      key,
      customerName: first.customerName,
      customerPhone: first.customerPhone,
      addressLine: first.addressLine,
      zone: first.zone,
      placedAt: newest.placedAt,
      deliveryAfterHours: Math.max(...sorted.map((o) => o.deliveryAfterHours)),
      orders: sorted,
      totalCombined: sorted.reduce((sum, o) => sum + o.total, 0),
      itemCountCombined: sorted.reduce((sum, o) => sum + o.itemCount, 0),
    });
  }

  return groups.sort(compareGroups);
}

export type AggregatedKitchenLine = {
  nameEn: string;
  qty: number;
  orderCodes: string[];
  deliveryAfterHours: number;
};

/** One row per dish + delivery window (same dish with ASAP vs +4h stays separate). */
export function aggregateGroupItems(group: OrderGroup): AggregatedKitchenLine[] {
  const byKey = new Map<string, AggregatedKitchenLine>();

  for (const order of group.orders) {
    for (const item of order.items) {
      const key = `${item.nameEn}::${order.deliveryAfterHours}`;
      const row = byKey.get(key);
      if (row) {
        row.qty += item.qty;
        if (!row.orderCodes.includes(order.orderCode)) {
          row.orderCodes.push(order.orderCode);
        }
      } else {
        byKey.set(key, {
          nameEn: item.nameEn,
          qty: item.qty,
          orderCodes: [order.orderCode],
          deliveryAfterHours: order.deliveryAfterHours,
        });
      }
    }
  }

  return [...byKey.values()].sort((a, b) => {
    if (a.deliveryAfterHours !== b.deliveryAfterHours) {
      return a.deliveryAfterHours - b.deliveryAfterHours;
    }
    return a.nameEn.localeCompare(b.nameEn);
  });
}

/** @deprecated Use sortOrdersForQueue */
export function sortOrdersFcfs(orders: BoardOrder[]): BoardOrder[] {
  return sortOrdersForQueue(orders);
}

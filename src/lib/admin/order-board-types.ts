import type * as s from "@/db/schema";

export type BoardOrderItem = {
  nameEn: string;
  qty: number;
  lineTotal: number;
};

export type BoardOrder = {
  id: string;
  orderCode: string;
  status: (typeof s.orderStatus.enumValues)[number];
  paymentMethod: string;
  total: number;
  customerName: string;
  customerPhone: string;
  addressLine: string;
  zone: string;
  placedAt: string;
  itemCount: number;
  deliveryAfterHours: number;
  items: BoardOrderItem[];
};

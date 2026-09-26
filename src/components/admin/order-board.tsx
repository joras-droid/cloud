"use client";

import { useState } from "react";
import Link from "next/link";
import { Banknote, QrCode } from "lucide-react";
import {
  ORDER_STATUS_OPTIONS,
  OrderStatusPill,
} from "@/components/admin/order-status-pill";
import { deliveryAfterHoursLabel } from "@/lib/checkout/delivery-timing";
import { formatPaisa } from "@/lib/money";
import { cn } from "@/lib/utils";

const COLUMNS = [
  "pending_payment",
  "payment_submitted",
  "payment_rejected",
  "pending_confirmation",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
] as const;

type Column = (typeof COLUMNS)[number];

/** Whole-card wash so a status is obvious without reading the pill. */
const CARD_TONE: Partial<
  Record<(typeof ORDER_STATUS_OPTIONS)[number]["value"], string>
> = {
  pending_payment: "border-red-200 bg-red-50",
  payment_submitted: "border-red-200 bg-red-50",
  pending_confirmation: "border-red-200 bg-red-50",
  confirmed: "border-red-200 bg-red-50",
  preparing: "border-yellow-300 bg-yellow-50",
  ready: "border-orange-300 bg-orange-50",
  out_for_delivery: "border-sky-300 bg-sky-50",
  delivered: "border-green-300 bg-green-50",
};

export type BoardOrder = {
  id: string;
  orderCode: string;
  status: (typeof ORDER_STATUS_OPTIONS)[number]["value"];
  paymentMethod: string;
  total: number;
  customerName: string;
  zone: string;
  itemCount: number;
  deliveryAfterHours: number;
};

const LABELS = new Map(ORDER_STATUS_OPTIONS.map((option) => [option.value, option.label]));

function isPrepaid(order: BoardOrder): boolean {
  return (
    order.paymentMethod !== "cod" &&
    order.status !== "pending_payment" &&
    order.status !== "payment_rejected"
  );
}

function OrderCard({ order, delay }: { order: BoardOrder; delay: number }) {
  const prepaid = isPrepaid(order);

  return (
    <Link
      href={`/admin/orders/${order.id}`}
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        "focus-ring animate-rise rounded-card border p-4 shadow-card transition-transform active:scale-[0.98] lg:transition-shadow lg:hover:shadow-lifted lg:active:scale-100",
        CARD_TONE[order.status] ?? "border-line bg-paper",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-base font-bold text-ink lg:text-sm">
          {order.orderCode}
        </span>
        {order.paymentMethod === "cod" ? (
          <Banknote className="size-4 text-gold" aria-label="Cash on delivery" />
        ) : (
          <QrCode className="size-4 text-herb" aria-label="QR payment" />
        )}
        <span className="ml-auto font-semibold text-ink tabular-nums">
          {formatPaisa(order.total)}
        </span>
      </div>
      <p className="mt-2 truncate text-base text-ink lg:text-sm">{order.customerName}</p>
      <p className="truncate text-sm text-ink-soft">
        {order.zone} · {order.itemCount} items
        {order.deliveryAfterHours > 0
          ? ` · ${deliveryAfterHoursLabel(order.deliveryAfterHours)}`
          : ""}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <OrderStatusPill status={order.status} />
        {prepaid ? (
          <span className="ml-auto shrink-0 rounded-pill bg-white/80 px-2.5 py-1 text-xs font-semibold text-herb">
            Pre-paid / तिरिसकेको
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function MobileBoard({ orders }: { orders: BoardOrder[] }) {
  const [filter, setFilter] = useState<Column | "all">("all");
  const visible = filter === "all" ? orders : orders.filter((order) => order.status === filter);

  return (
    <div>
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-4">
        <FilterChip
          label="All"
          count={orders.length}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        {COLUMNS.map((status) => {
          const count = orders.filter((order) => order.status === status).length;
          if (count === 0) return null;
          return (
            <FilterChip
              key={status}
              label={LABELS.get(status) ?? status}
              count={count}
              active={filter === status}
              onClick={() => setFilter(status)}
            />
          );
        })}
      </div>
      <div key={filter} className="grid gap-3">
        {visible.length === 0 ? (
          <p className="rounded-card border border-dashed border-line p-8 text-center text-ink-soft">
            Nothing in this step.
          </p>
        ) : (
          visible.map((order, index) => (
            <OrderCard key={order.id} order={order} delay={Math.min(index, 8) * 40} />
          ))
        )}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-ring inline-flex h-11 shrink-0 items-center gap-2 rounded-pill px-4 text-sm font-semibold transition-colors",
        active ? "bg-ink text-cream" : "bg-paper text-ink-soft ring-1 ring-line",
      )}
    >
      {label}
      <span className={cn("tabular-nums", active ? "text-cream/80" : "text-ink-faint")}>
        {count}
      </span>
    </button>
  );
}

function DesktopBoard({ orders }: { orders: BoardOrder[] }) {
  return (
    <div className="no-scrollbar flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((status) => {
        const columnOrders = orders.filter((order) => order.status === status);
        return (
          <section key={status} className="flex w-72 shrink-0 flex-col gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              {LABELS.get(status) ?? status}
              <span className="rounded-pill bg-line/60 px-2 py-0.5 text-xs text-ink-soft tabular-nums">
                {columnOrders.length}
              </span>
            </h2>
            {columnOrders.map((order, index) => (
              <OrderCard key={order.id} order={order} delay={Math.min(index, 6) * 40} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

export function OrderBoard({ orders }: { orders: BoardOrder[] }) {
  return (
    <>
      <div className="lg:hidden">
        <MobileBoard orders={orders} />
      </div>
      <div className="hidden lg:block">
        <DesktopBoard orders={orders} />
      </div>
    </>
  );
}

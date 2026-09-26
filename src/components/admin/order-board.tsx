"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Banknote, LayoutGrid, List, QrCode, UtensilsCrossed } from "lucide-react";
import {
  AddressWithActions,
  PhoneWithActions,
} from "@/components/admin/contact-actions";
import {
  ORDER_STATUS_OPTIONS,
  OrderStatusPill,
} from "@/components/admin/order-status-pill";
import {
  aggregateGroupItems,
  groupOrdersByDelivery,
  sortOrdersForQueue,
} from "@/lib/admin/order-groups";
import type { BoardOrder } from "@/lib/admin/order-board-types";
import { deliveryAfterHoursLabel, deliveryAfterHoursShort } from "@/lib/checkout/delivery-timing";
import { formatOrderCreatedAt } from "@/lib/format-order-created";
import { formatPaisa } from "@/lib/money";
import { cn } from "@/lib/utils";

export type { BoardOrder } from "@/lib/admin/order-board-types";

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
type ListLayout = "summary" | "items";
type ViewMode = "status" | "queue";

const LABELS = new Map(ORDER_STATUS_OPTIONS.map((option) => [option.value, option.label]));

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

function isPrepaid(order: BoardOrder): boolean {
  return (
    order.paymentMethod !== "cod" &&
    order.status !== "pending_payment" &&
    order.status !== "payment_rejected"
  );
}

function groupCardTone(orders: BoardOrder[]): string {
  for (const status of COLUMNS) {
    if (orders.some((o) => o.status === status)) {
      return CARD_TONE[status] ?? "border-line bg-paper";
    }
  }
  return "border-line bg-paper";
}

function OrderCard({ order, delay }: { order: BoardOrder; delay: number }) {
  const prepaid = isPrepaid(order);

  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        "animate-rise rounded-card border shadow-card",
        CARD_TONE[order.status] ?? "border-line bg-paper",
      )}
    >
      <div className="p-4">
        <Link
          href={`/admin/orders/${order.id}`}
          className="focus-ring block transition-opacity hover:opacity-90"
        >
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tabular-nums text-ink lg:text-sm">
              {formatOrderCreatedAt(order.placedAt)}
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
          <p className="mt-2 truncate text-base text-ink lg:text-sm">
            {order.customerName}
          </p>
        </Link>
        <PhoneWithActions phone={order.customerPhone} className="mt-1" />
        <AddressWithActions
          addressLine={order.addressLine}
          className="mt-1"
        />
        <Link
          href={`/admin/orders/${order.id}`}
          className="focus-ring mt-2 block transition-opacity hover:opacity-90"
        >
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
      </div>
    </div>
  );
}

function GroupedDeliveryCard({
  group,
  layout,
  delay,
}: {
  group: ReturnType<typeof groupOrdersByDelivery>[number];
  layout: ListLayout;
  delay: number;
}) {
  const aggregated = useMemo(() => aggregateGroupItems(group), [group]);
  const primary = group.orders[0]!;
  const tone = groupCardTone(group.orders);

  return (
    <article
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        "animate-rise rounded-card border p-4 shadow-card lg:p-5",
        tone,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">{group.customerName}</p>
          <PhoneWithActions phone={group.customerPhone} className="mt-1" />
          <AddressWithActions
            addressLine={group.addressLine}
            className="mt-1.5"
          />
          {group.deliveryAfterHours > 0 ? (
            <p className="mt-0.5 text-sm text-ink-soft">
              {deliveryAfterHoursLabel(group.deliveryAfterHours)}
            </p>
          ) : null}
          {group.orders.length > 1 ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
              {group.orders.length} orders · same address
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-bold tabular-nums text-ink">
            {formatPaisa(group.totalCombined)}
          </p>
          <p className="text-xs text-ink-soft">{group.itemCountCombined} items total</p>
        </div>
      </header>

      {layout === "items" ? (
        <section className="mt-4 rounded-xl border border-line/80 bg-paper/90 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Kitchen list
          </h3>
          <ul className="mt-3 divide-y divide-line">
            {aggregated.map((line) => (
              <li
                key={`${line.nameEn}-${line.deliveryAfterHours}`}
                className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="min-w-0 text-lg font-semibold leading-snug text-ink">
                  <span className="tabular-nums">{line.qty}×</span> {line.nameEn}
                </span>
                <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-brand-700">
                  {deliveryAfterHoursShort(line.deliveryAfterHours)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="mt-4 flex flex-wrap gap-2 border-t border-line/60 pt-4">
        {group.orders.map((order) => (
          <Link
            key={order.id}
            href={`/admin/orders/${order.id}`}
            className="focus-ring inline-flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-line bg-paper/80 px-3 py-2 text-sm hover:bg-paper sm:flex-nowrap"
          >
            <span className="text-xs text-ink-faint tabular-nums">
              {formatOrderCreatedAt(order.placedAt)}
            </span>
            <OrderStatusPill status={order.status} />
            <span className="ml-auto flex shrink-0 items-center gap-2">
              <span className="tabular-nums text-ink-soft">
                {formatPaisa(order.total)}
              </span>
              <span className="whitespace-nowrap text-xs font-semibold text-brand-700">
                {deliveryAfterHoursShort(order.deliveryAfterHours)}
              </span>
            </span>
          </Link>
        ))}
      </footer>

      <Link
        href={`/admin/orders/${primary.id}`}
        className="focus-ring mt-3 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800"
      >
        Open {group.orders.length > 1 ? "first order" : "order"} →
      </Link>
    </article>
  );
}

function ViewToggle({
  view,
  onView,
  listLayout,
  onListLayout,
}: {
  view: ViewMode;
  onView: (view: ViewMode) => void;
  listLayout: ListLayout;
  onListLayout: (layout: ListLayout) => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onView("status")}
          className={cn(
            "focus-ring inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold",
            view === "status"
              ? "bg-ink text-cream"
              : "bg-paper text-ink-soft ring-1 ring-line",
          )}
        >
          <LayoutGrid className="size-4" aria-hidden />
          By status
        </button>
        <button
          type="button"
          onClick={() => onView("queue")}
          className={cn(
            "focus-ring inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold",
            view === "queue"
              ? "bg-ink text-cream"
              : "bg-paper text-ink-soft ring-1 ring-line",
          )}
        >
          <List className="size-4" aria-hidden />
          Kitchen queue
        </button>
      </div>
      {view === "queue" ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onListLayout("summary")}
            className={cn(
              "focus-ring inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold",
              listLayout === "summary"
                ? "bg-brand-600 text-white"
                : "bg-paper text-ink-soft ring-1 ring-line",
            )}
          >
            Summary
          </button>
          <button
            type="button"
            onClick={() => onListLayout("items")}
            className={cn(
              "focus-ring inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold",
              listLayout === "items"
                ? "bg-brand-600 text-white"
                : "bg-paper text-ink-soft ring-1 ring-line",
            )}
          >
            <UtensilsCrossed className="size-4" aria-hidden />
            Item view
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MobileBoard({ orders }: { orders: BoardOrder[] }) {
  const [filter, setFilter] = useState<Column | "all">("all");
  const [view, setView] = useState<ViewMode>("queue");
  const [listLayout, setListLayout] = useState<ListLayout>("items");
  const fcfs = useMemo(() => sortOrdersForQueue(orders), [orders]);
  const groups = useMemo(() => groupOrdersByDelivery(fcfs), [fcfs]);

  if (view === "queue") {
    return (
      <div>
        <ViewToggle
          view={view}
          onView={setView}
          listLayout={listLayout}
          onListLayout={setListLayout}
        />
        <div className="grid gap-4">
          {groups.map((group, index) => (
            <GroupedDeliveryCard
              key={group.key}
              group={group}
              layout={listLayout}
              delay={Math.min(index, 8) * 40}
            />
          ))}
        </div>
      </div>
    );
  }

  const visible =
    filter === "all" ? fcfs : fcfs.filter((order) => order.status === filter);

  return (
    <div>
      <ViewToggle
        view={view}
        onView={setView}
        listLayout={listLayout}
        onListLayout={setListLayout}
      />
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
  const [view, setView] = useState<ViewMode>("queue");
  const [listLayout, setListLayout] = useState<ListLayout>("items");
  const fcfs = useMemo(() => sortOrdersForQueue(orders), [orders]);
  const groups = useMemo(() => groupOrdersByDelivery(fcfs), [fcfs]);

  if (view === "queue") {
    return (
      <div>
        <ViewToggle
          view={view}
          onView={setView}
          listLayout={listLayout}
          onListLayout={setListLayout}
        />
        <div className="grid gap-4 xl:grid-cols-2">
          {groups.map((group, index) => (
            <GroupedDeliveryCard
              key={group.key}
              group={group}
              layout={listLayout}
              delay={Math.min(index, 8) * 40}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <ViewToggle
        view={view}
        onView={setView}
        listLayout={listLayout}
        onListLayout={setListLayout}
      />
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((status) => {
          const columnOrders = fcfs.filter((order) => order.status === status);
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

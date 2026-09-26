import Image from "next/image";
import { Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminOrder } from "@/server/queries/admin-orders";
import {
  AddressWithActions,
  CopyIconButton,
  PhoneWithActions,
} from "@/components/admin/contact-actions";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { OrderStatusPill } from "@/components/admin/order-status-pill";
import { CopyText } from "@/components/copy-text";
import { ShareLink } from "@/components/share-link";
import { RiderForm } from "@/components/admin/rider-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/field";
import { telHref } from "@/lib/phone";
import { trackPageUrl } from "@/lib/track/url";
import { cn } from "@/lib/utils";
import {
  cancelOrder,
  rejectPayment,
  setOrderStatus,
} from "@/server/actions/orders";
import { deliveryAfterHoursLabel } from "@/lib/checkout/delivery-timing";
import { formatOrderCreatedAt } from "@/lib/format-order-created";
import { formatPaisa } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();
  const trackUrl = trackPageUrl(order.customer.phone);

  const locationCopy = [
    order.addressLine,
    order.landmark ? `Landmark: ${order.landmark}` : null,
    order.zone.nameEn,
    order.mapUrl,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="w-full min-w-0 max-w-4xl pb-28 lg:pb-0">
      <AdminBackLink href="/admin/orders">← Orders</AdminBackLink>

      <header className="mb-6 mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tabular-nums text-ink">
            {formatOrderCreatedAt(order.placedAt)}
          </h1>
          <p className="mt-1 font-medium text-ink">{order.customer.name}</p>
          <p className="mt-0.5 font-mono text-xs text-ink-faint">{order.orderCode}</p>
        </div>
        <OrderStatusPill status={order.status} />
      </header>

      <div className="flex min-w-0 flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-6">
        <div className="contents min-w-0 lg:grid lg:gap-6">
          <section
            style={{ animationDelay: "80ms" }}
            className="animate-rise order-3 min-w-0 overflow-hidden rounded-card border border-line bg-paper p-5 lg:order-none"
          >
            <h2 className="font-display text-lg font-bold">Items</h2>
            <ul className="mt-3 divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">
                      {item.qty}× {item.nameEn}
                    </p>
                    <p className="text-sm text-ink-soft">
                      {[
                        item.variant?.labelEn,
                        ...item.modifiers.map((m) => m.nameEn),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <p className="tabular-nums">{formatPaisa(item.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="tabular-nums">{formatPaisa(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Delivery</dt>
                <dd className="tabular-nums">{formatPaisa(order.deliveryFee)}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPaisa(order.total)}</dd>
              </div>
            </dl>
          </section>

          <section className="animate-rise order-1 min-w-0 overflow-hidden rounded-card border border-line bg-paper p-5 lg:order-none">
            <h2 className="font-display text-lg font-bold">Deliver to</h2>
            <div className="mt-3 grid min-w-0 gap-3">
              <div className="min-w-0 rounded-xl border border-line px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Phone
                </p>
                <PhoneWithActions
                  phone={order.customer.phone}
                  className="mt-1 font-medium text-ink"
                />
                <p className="mt-1 text-sm font-medium">
                  {order.callRequested ? "Call the customer" : "Do not call"}
                </p>
              </div>
              <div className="min-w-0 rounded-xl border border-line px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Location
                </p>
                <AddressWithActions
                  addressLine={order.addressLine}
                  copyValue={locationCopy}
                  className="mt-1 font-medium"
                />
                {order.landmark ? (
                  <p className="mt-1 text-sm text-ink-soft">
                    Landmark: {order.landmark}
                  </p>
                ) : null}
                <p className="text-sm text-ink-soft">{order.zone.nameEn}</p>
                <p className="mt-2 text-sm font-medium text-ink">
                  Deliver: {deliveryAfterHoursLabel(order.deliveryAfterHours)}
                </p>
                {order.mapUrl ? (
                  <p className="mt-1">
                    <a
                      href={order.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-brand-700 underline"
                    >
                      Google Maps
                    </a>
                  </p>
                ) : null}
              </div>
              {trackUrl ? (
                <div className="min-w-0 rounded-xl border border-line px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Track link
                  </p>
                  <p className="mt-1 break-all text-sm font-medium text-ink">{trackUrl}</p>
                  <div className="mt-2 flex shrink-0 items-center gap-1">
                    <ShareLink url={trackUrl} label="Share track link" iconOnly />
                    <CopyIconButton value={trackUrl} label="Copy track link" />
                  </div>
                </div>
              ) : null}
            </div>
            {order.notes ? (
              <p className="mt-3 rounded-xl bg-gold-soft p-3 text-sm">
                Kitchen note: {order.notes}
              </p>
            ) : null}
          </section>

          {order.payment?.screenshotUrl ? (
            <section
              style={{ animationDelay: "160ms" }}
              className="animate-rise order-4 rounded-card border border-line bg-paper p-5 lg:order-none"
            >
              <h2 className="font-display text-lg font-bold">
                Payment screenshot
              </h2>
              <div className="relative mt-3 aspect-[3/4] max-w-sm overflow-hidden rounded-xl bg-line">
                <Image
                  src={order.payment.screenshotUrl}
                  alt="Payment screenshot"
                  fill
                  className="object-contain"
                  sizes="384px"
                />
              </div>
              <p className="mt-2 text-sm text-ink-soft">
                {order.payment.payerName} · {formatPaisa(order.payment.amount)}
              </p>
            </section>
          ) : null}
        </div>

        <aside
          style={{ animationDelay: "40ms" }}
          className="animate-rise order-2 min-w-0 grid gap-4 lg:order-none"
        >
          <section className="grid min-w-0 gap-2 overflow-hidden rounded-card border border-line bg-paper p-4">
            <h3 className="font-semibold">Order status</h3>
            {(
              [
                { to: "preparing", title: "बन्दै छ", hint: "Processing" },
                {
                  to: "ready",
                  title: "डेलिभरी मान्छेको प्रतिक्षामा",
                  hint: "Waiting for the delivery person",
                },
                { to: "out_for_delivery", title: "गयो", hint: "On the way" },
              ] as const
            ).map((step) =>
              order.status === step.to ? (
                <div
                  key={step.to}
                  aria-current="step"
                  className={cn(
                    buttonVariants({ variant: "primary", block: true }),
                    "h-auto flex-col gap-0.5 py-3 text-center [overflow-wrap:anywhere]",
                  )}
                >
                  <span>{step.title}</span>
                  <span className="text-xs font-normal opacity-80">{step.hint}</span>
                </div>
              ) : (
                <form key={step.to} action={setOrderStatus}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="to" value={step.to} />
                  <Button
                    type="submit"
                    block
                    variant="outline"
                    className="h-auto flex-col gap-0.5 py-3 text-center [overflow-wrap:anywhere]"
                  >
                    <span>{step.title}</span>
                    <span className="text-xs font-normal opacity-80">{step.hint}</span>
                  </Button>
                </form>
              ),
            )}
            <form action={setOrderStatus}>
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="to" value="delivered" />
              <Button
                type="submit"
                block
                variant={order.status === "delivered" ? "primary" : "secondary"}
                disabled={order.status === "delivered"}
              >
                Delivered
              </Button>
            </form>
          </section>

          <RiderForm
            orderId={order.id}
            phone={order.delivery?.riderPhone ?? ""}
            yangoRef={order.delivery?.yangoRef ?? ""}
          />
        </aside>
      </div>

      {order.paymentMethod === "cod" ? (
        <section className="mt-8 rounded-card border border-chilli/30 bg-chilli-soft p-4">
          <h3 className="font-semibold">Reject order</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Cancel this order. The customer will see it as cancelled.
          </p>
          <form action={cancelOrder} className="mt-3 grid gap-2 sm:max-w-md">
            <input type="hidden" name="orderId" value={order.id} />
            <Textarea name="reason" placeholder="Why is this order rejected?" />
            <Button type="submit" variant="danger" block>
              Reject order
            </Button>
          </form>
        </section>
      ) : (
        <section className="mt-8 rounded-card border border-chilli/30 bg-chilli-soft p-4">
          <h3 className="font-semibold">Reject order</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Reject the payment so the customer can upload a new screenshot.
          </p>
          <form action={rejectPayment} className="mt-3 grid gap-2 sm:max-w-md">
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="paymentId" value={order.payment?.id ?? ""} />
            <Select name="rejectReason" defaultValue="wrong_amount">
              <option value="wrong_amount">Wrong amount</option>
              <option value="unreadable">Unreadable</option>
              <option value="duplicate">Duplicate</option>
              <option value="not_received">Not received</option>
              <option value="other">Other</option>
            </Select>
            <Textarea name="rejectNote" placeholder="Note for the customer" />
            <Button type="submit" variant="danger" block>
              Reject order
            </Button>
          </form>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 p-3 backdrop-blur-md lg:hidden">
        <div
          className={cn(
            "mx-auto grid max-w-4xl gap-2 pb-[env(safe-area-inset-bottom)]",
            trackUrl ? "grid grid-cols-3" : "grid grid-cols-2",
          )}
        >
          <a
            href={telHref(order.customer.phone)}
            className={cn(
              buttonVariants({ size: "lg" }),
              "min-w-0 justify-center px-2 text-sm",
            )}
          >
            <Phone className="size-4 shrink-0" aria-hidden />
            <span className="truncate">Call</span>
          </a>
          <CopyText
            value={locationCopy}
            label="Copy location"
            copyLabel="Copy"
            copiedLabel="OK"
            className="h-13 min-w-0 justify-center truncate bg-paper px-2 text-sm"
          />
          {trackUrl ? (
            <ShareLink
              url={trackUrl}
              label="Share track link"
              iconOnly
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "h-13 min-w-0 justify-center px-2",
              )}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}


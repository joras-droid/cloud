import Image from "next/image";
import Link from "next/link";
import { Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminOrder } from "@/server/queries/admin-orders";
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
  confirmCod,
  rejectPayment,
  setOrderStatus,
  verifyPayment,
} from "@/server/actions/orders";
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
    <div className="max-w-4xl pb-28 lg:pb-0">
      <Link
        href="/admin/orders"
        className="focus-ring mb-4 inline-block rounded text-sm text-ink-soft hover:text-ink"
      >
        ← Orders
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold text-ink">
            {order.orderCode}
          </h1>
          <p className="mt-1 text-ink-soft">
            {order.customer.name} · {order.customer.phone}
          </p>
        </div>
        <OrderStatusPill status={order.status} />
      </header>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-6">
        <div className="contents lg:grid lg:gap-6">
          <section
            style={{ animationDelay: "80ms" }}
            className="animate-rise order-3 rounded-card border border-line bg-paper p-5 lg:order-none"
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

          <section className="animate-rise order-1 rounded-card border border-line bg-paper p-5 lg:order-none">
            <h2 className="font-display text-lg font-bold">Deliver to</h2>
            <div className="mt-3 grid gap-3">
              <div className="flex flex-col gap-3 rounded-xl border border-line px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Phone
                  </p>
                  <p className="mt-0.5 font-medium tabular-nums">
                    {order.customer.phone}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {order.callRequested ? "Call the customer" : "Do not call"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <a
                    href={telHref(order.customer.phone)}
                    className={cn(buttonVariants({ size: "sm" }), "max-lg:h-12 max-lg:px-4")}
                  >
                    <Phone className="size-4" aria-hidden />
                    Call
                  </a>
                  <CopyText
                    value={order.customer.phone}
                    label="Copy phone number"
                    copyLabel="Copy"
                    copiedLabel="Copied"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-line px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Location
                  </p>
                  <p className="mt-0.5 font-medium">{order.addressLine}</p>
                  {order.landmark ? (
                    <p className="text-sm text-ink-soft">
                      Landmark: {order.landmark}
                    </p>
                  ) : null}
                  <p className="text-sm text-ink-soft">{order.zone.nameEn}</p>
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
                <CopyText
                  value={locationCopy}
                  label="Copy location"
                  copyLabel="Copy"
                  copiedLabel="Copied"
                  className="max-lg:h-12"
                />
              </div>
              {trackUrl ? (
                <div className="flex flex-col gap-3 rounded-xl border border-line px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      Track link
                    </p>
                    <p className="mt-0.5 break-all text-sm font-medium">{trackUrl}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <ShareLink url={trackUrl} label="Share" />
                    <CopyText
                      value={trackUrl}
                      label="Copy track link"
                      copyLabel="Copy"
                      copiedLabel="Copied"
                    />
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
          className="animate-rise order-2 grid gap-4 lg:order-none"
        >
          {order.paymentMethod === "cod" ? (
            <section className="rounded-card border border-herb/30 bg-herb-soft p-4">
              <h3 className="font-semibold">Verify order</h3>
              <p className="mt-1 text-sm text-ink-soft">
                Confirm this cash order and send it to the kitchen.
              </p>
              <form action={confirmCod} className="mt-3">
                <input type="hidden" name="orderId" value={order.id} />
                <Button type="submit" block>
                  Verify order
                </Button>
              </form>
            </section>
          ) : (
            <section className="rounded-card border border-herb/30 bg-herb-soft p-4">
              <h3 className="font-semibold">Verify order</h3>
              <p className="mt-1 text-sm text-ink-soft">
                Mark the payment as received and confirm the order.
              </p>
              <form action={verifyPayment} className="mt-3">
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="paymentId" value={order.payment?.id ?? ""} />
                <Button type="submit" block>
                  Verify order
                </Button>
              </form>
            </section>
          )}

          {order.paymentMethod === "cod" ? (
            <section className="rounded-card border border-chilli/30 bg-chilli-soft p-4">
              <h3 className="font-semibold">Reject order</h3>
              <p className="mt-1 text-sm text-ink-soft">
                Cancel this order. The customer will see it as cancelled.
              </p>
              <form action={cancelOrder} className="mt-3 grid gap-2">
                <input type="hidden" name="orderId" value={order.id} />
                <Textarea name="reason" placeholder="Why is this order rejected?" />
                <Button type="submit" variant="danger" block>
                  Reject order
                </Button>
              </form>
            </section>
          ) : (
            <section className="rounded-card border border-chilli/30 bg-chilli-soft p-4">
              <h3 className="font-semibold">Reject order</h3>
              <p className="mt-1 text-sm text-ink-soft">
                Reject the payment so the customer can upload a new screenshot.
              </p>
              <form action={rejectPayment} className="mt-3 grid gap-2">
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

          <section className="grid gap-2 rounded-card border border-line bg-paper p-4">
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
                    "h-auto flex-col gap-0.5 py-3",
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
                    className="h-auto flex-col gap-0.5 py-3"
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

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 p-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-2 pb-[env(safe-area-inset-bottom)]">
          <a
            href={telHref(order.customer.phone)}
            className={cn(buttonVariants({ size: "lg" }), "min-w-0 px-2")}
          >
            <Phone className="size-4 shrink-0" aria-hidden />
            Call
          </a>
          <CopyText
            value={locationCopy}
            label="Copy location"
            copyLabel="Location"
            copiedLabel="Copied"
            className="h-13 w-full justify-center bg-paper px-2"
          />
          {trackUrl ? (
            <ShareLink
              url={trackUrl}
              label="Share"
              className="h-13 w-full justify-center px-2"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}


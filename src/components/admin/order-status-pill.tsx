import { cn } from "@/lib/utils";

type Status =
  | "pending_payment"
  | "payment_submitted"
  | "payment_rejected"
  | "pending_confirmation"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

const STYLES: Record<Status, { label: string; className: string }> = {
  pending_payment: {
    label: "Awaiting payment",
    className: "bg-line/60 text-ink-soft",
  },
  payment_submitted: {
    label: "Verify payment",
    className: "bg-chilli-soft text-chilli",
  },
  payment_rejected: {
    label: "Payment rejected",
    className: "bg-chilli text-white",
  },
  pending_confirmation: {
    label: "Confirm COD",
    className: "bg-gold-soft text-gold",
  },
  confirmed: { label: "Confirmed", className: "bg-herb-soft text-herb" },
  preparing: { label: "बन्दै छ", className: "bg-brand-100 text-brand-700" },
  ready: { label: "प्रतिक्षामा", className: "bg-brand-500 text-white" },
  out_for_delivery: { label: "गयो", className: "bg-ink text-cream" },
  delivered: { label: "Delivered", className: "bg-herb text-white" },
  cancelled: { label: "Cancelled", className: "bg-line text-ink-faint" },
};

export const ORDER_STATUS_OPTIONS: { value: Status; label: string }[] = (
  Object.entries(STYLES) as [Status, { label: string }][]
).map(([value, style]) => ({ value, label: style.label }));

export function OrderStatusPill({ status }: { status: Status }) {
  const style = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex rounded-pill px-2.5 py-1 text-xs font-semibold",
        style.className,
      )}
    >
      {style.label}
    </span>
  );
}

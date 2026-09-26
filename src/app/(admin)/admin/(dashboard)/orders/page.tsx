import { OrderBoard } from "@/components/admin/order-board";
import { RefreshOrders } from "@/components/admin/refresh-orders";
import { requireAdmin } from "@/lib/auth/session";
import { getOrderBoard } from "@/server/queries/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  await requireAdmin();
  const orders = await getOrderBoard();

  return (
    <div>
      <RefreshOrders />
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">Orders</h1>
        <p className="mt-1 text-ink-soft">
          {orders.length} {orders.length === 1 ? "order" : "orders"}
        </p>
      </header>

      {orders.length === 0 ? (
        <p className="rounded-card border border-dashed border-line p-10 text-center text-ink-soft">
          No orders right now.
        </p>
      ) : (
        <OrderBoard
          orders={orders.map((order) => ({
            id: order.id,
            orderCode: order.orderCode,
            status: order.status,
            paymentMethod: order.paymentMethod,
            total: order.total,
            customerName: order.customerName,
            zone: order.zone,
            itemCount: order.itemCount,
            deliveryAfterHours: order.deliveryAfterHours,
          }))}
        />
      )}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatIdr } from "@/lib/format";
import type { OrderStatus } from "@prisma/client";
import { updateOrderStatus } from "../actions";

export const dynamic = "force-dynamic";

const STATUSES: OrderStatus[] = [
  "DRAFT",
  "PENDING_PAYMENT",
  "PAID",
  "PACKED",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
];

function statusPill(status: OrderStatus): string {
  switch (status) {
    case "PAID":
    case "COMPLETED":
      return "pill pill-ok";
    case "PACKED":
    case "SHIPPED":
      return "pill pill-info";
    case "PENDING_PAYMENT":
      return "pill pill-warn";
    case "CANCELLED":
    case "REFUNDED":
      return "pill pill-danger";
    default:
      return "pill";
  }
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      channel: true,
      customer: true,
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) return notFound();

  return (
    <>
      <div className="greet">
        <div>
          <div className="greet-eyebrow">
            <Link href="/admin/orders" className="link">
              ← Orders
            </Link>
          </div>
          <h1 className="greet-h1">Order {order.number}</h1>
          <div className="greet-sub">
            {order.channel.name} ·{" "}
            {order.createdAt.toLocaleString("en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
        <div className="greet-right">
          <span className={statusPill(order.status)}>
            {order.status.replace(/_/g, " ").toLowerCase()}
          </span>
          <form action={updateOrderStatus} style={{ display: "flex", gap: 8 }}>
            <input type="hidden" name="id" value={order.id} />
            <select className="select" name="status" defaultValue={order.status} style={{ width: 190 }}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ").toLowerCase()}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-primary">
              Update status
            </button>
          </form>
        </div>
      </div>

      <div className="order-grid">
        {/* Items */}
        <div className="panel">
          <div className="panel-hdr">
            <span className="panel-title">Items · {order.items.length}</span>
          </div>
          <div className="atable-wrap">
            <table className="atable">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="t-right">Qty</th>
                  <th className="t-right">Unit</th>
                  <th className="t-right">Line total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.id}>
                    <td className="t-ink">
                      {it.nameSnapshot}
                      {it.conditionSnapshot ? (
                        <span className="cell-sub"> · {it.conditionSnapshot}</span>
                      ) : null}
                    </td>
                    <td className="t-right mono">{it.qty}</td>
                    <td className="t-right mono">{formatIdr(it.unitPriceIdr.toString())}</td>
                    <td className="t-right mono t-ink">
                      {formatIdr(Number(it.unitPriceIdr.toString()) * it.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary + customer */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="panel">
            <div className="panel-hdr">
              <span className="panel-title">Summary</span>
            </div>
            <div className="panel-body">
              <div className="kv">
                <span className="k">Subtotal</span>
                <span className="v mono">{formatIdr(order.subtotal.toString())}</span>
              </div>
              <div className="kv">
                <span className="k">Tax (PPN)</span>
                <span className="v mono">{formatIdr(order.tax.toString())}</span>
              </div>
              <div className="kv">
                <span className="k">Shipping</span>
                <span className="v mono">{formatIdr(order.shippingFee.toString())}</span>
              </div>
              <div className="kv">
                <span className="k">Discount</span>
                <span className="v mono">−{formatIdr(order.discount.toString())}</span>
              </div>
              <div className="kv" style={{ fontWeight: 600 }}>
                <span className="k" style={{ color: "var(--ink)" }}>
                  Total
                </span>
                <span className="v mono">{formatIdr(order.total.toString())}</span>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-hdr">
              <span className="panel-title">Customer</span>
            </div>
            <div className="panel-body">
              <div className="kv">
                <span className="k">Account</span>
                <span className="v">{order.customer?.name ?? order.customer?.email ?? "Guest"}</span>
              </div>
              {order.notes && (
                <div style={{ marginTop: 10, fontSize: 13, color: "var(--body)", whiteSpace: "pre-wrap" }}>
                  {order.notes}
                </div>
              )}
            </div>
          </div>

          {order.payments.length > 0 && (
            <div className="panel">
              <div className="panel-hdr">
                <span className="panel-title">Payments</span>
              </div>
              <div className="panel-body">
                {order.payments.map((p) => (
                  <div className="kv" key={p.id}>
                    <span className="k">
                      {p.gateway} {p.method ? `· ${p.method}` : ""}
                    </span>
                    <span className="v mono">
                      {p.status} · {formatIdr(p.amount.toString())}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

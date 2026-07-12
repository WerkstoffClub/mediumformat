import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatIdr } from "@/lib/format";
import type { OrderStatus } from "@prisma/client";
import { Timeline } from "@/components/admin/Timeline";
import { updateOrderStatus, createShipment } from "../actions";

const TIMELINE_STEPS = ["Draft", "Pending", "Paid", "Packed", "Shipped", "Completed"];
const TIMELINE_INDEX: Record<string, number> = {
  DRAFT: 0,
  PENDING_PAYMENT: 1,
  PAID: 2,
  PACKED: 3,
  SHIPPED: 4,
  COMPLETED: 5,
};

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
      shippingAddress: true,
      payments: { orderBy: { createdAt: "desc" } },
      shipments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) return notFound();

  const rateId = order.notes?.match(/RateId:\s*(\S+)/)?.[1] ?? "";
  const courierLabel = order.notes?.match(/Courier:\s*(.+)/)?.[1] ?? "";

  const movements = await prisma.stockMovement.findMany({
    where: { refType: "ORDER", refId: order.id },
    orderBy: { createdAt: "desc" },
    include: { variant: true, location: true },
  });

  const terminal = order.status === "CANCELLED" || order.status === "REFUNDED";

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
          <Link href={`/admin/pos/receipt/${order.id}`} className="btn-sec">
            Receipt
          </Link>
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

      {terminal ? (
        <div className="banner-ok" style={{ borderColor: "rgba(239,68,68,.3)", background: "var(--danger-t)", color: "var(--danger)" }}>
          This order is {order.status.toLowerCase()}.
        </div>
      ) : (
        <Timeline steps={TIMELINE_STEPS} currentIndex={TIMELINE_INDEX[order.status] ?? 0} />
      )}

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

          <div className="panel">
            <div className="panel-hdr">
              <span className="panel-title">Stock movements</span>
              <Link href="/admin/inventory/movements" className="link">All →</Link>
            </div>
            <div className="panel-body">
              {movements.length === 0 ? (
                <p className="cell-sub">
                  No stock booked yet. Mark the order Paid to decrement stock.
                </p>
              ) : (
                movements.map((m) => (
                  <div className="kv" key={m.id}>
                    <span className="k">
                      <span className="mono">{m.variant.sku}</span> · {m.location.name}
                    </span>
                    <span className="v mono" style={{ color: "var(--danger)" }}>
                      {m.delta}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Shipping / AWB */}
          <div className="panel">
            <div className="panel-hdr">
              <span className="panel-title">Shipping</span>
              {courierLabel && <span className="cell-sub">{courierLabel}</span>}
            </div>
            <div className="panel-body">
              {order.shippingAddress ? (
                <div style={{ fontSize: 13, color: "var(--body)", marginBottom: 12, whiteSpace: "pre-wrap" }}>
                  <strong style={{ color: "var(--ink)" }}>{order.shippingAddress.name}</strong>
                  {"\n"}
                  {order.shippingAddress.line1}
                  {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}
                  {"\n"}
                  {[order.shippingAddress.city, order.shippingAddress.province, order.shippingAddress.postal]
                    .filter(Boolean)
                    .join(", ")}
                  {order.shippingAddress.phone ? `\n${order.shippingAddress.phone}` : ""}
                </div>
              ) : null}

              {order.shipments.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {order.shipments.map((s) => (
                    <div key={s.id}>
                      <div className="kv">
                        <span className="k">
                          {s.courier}
                          {s.service ? ` · ${s.service}` : ""}
                        </span>
                        <span className={`pill ${s.status === "DELIVERED" ? "pill-ok" : "pill-info"}`}>
                          {s.status.replace(/_/g, " ").toLowerCase()}
                        </span>
                      </div>
                      {s.awb && (
                        <div className="kv">
                          <span className="k">AWB</span>
                          <span className="v mono">{s.awb}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                        <Link
                          href={`/admin/orders/${order.id}/label`}
                          className="btn-sec"
                          target="_blank"
                        >
                          Print label
                        </Link>
                        {s.labelUrl && (
                          <a href={s.labelUrl} className="btn-sec" target="_blank" rel="noreferrer">
                            Courier label ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="cell-sub">No shipment yet.</p>
              )}

              {!terminal && (
                <form action={createShipment} style={{ marginTop: 14 }}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <div className="field">
                    <label htmlFor="rateId">Courier rate</label>
                    <input
                      className="input"
                      id="rateId"
                      name="rateId"
                      defaultValue={rateId || "jne:reg"}
                      placeholder="jne:reg"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="awb">AWB (manual — leave blank to book via Biteship)</label>
                    <input className="input" id="awb" name="awb" placeholder="Optional tracking number" />
                  </div>
                  <button type="submit" className="btn-primary">
                    Create shipment
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

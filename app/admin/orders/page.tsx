import Link from "next/link";
import { PageShell } from "@/components/admin/PageShell";
import { prisma } from "@/lib/db";
import { formatIdr } from "@/lib/format";
import type { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

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

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    include: { channel: true, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <PageShell title="Orders" description="Unified across every sales channel.">
      {orders.length === 0 ? (
        <div className="coming">No orders yet.</div>
      ) : (
        <div className="panel">
          <div className="panel-hdr">
            <span className="panel-title">All orders</span>
          </div>
          <div className="atable-wrap">
            <table className="atable">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th className="t-right">Items</th>
                  <th className="t-right">Total</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="mono t-ink">
                      <Link href={`/admin/orders/${o.id}`} className="link" style={{ color: "var(--ink)" }}>
                        {o.number}
                      </Link>
                    </td>
                    <td>{o.channel.name}</td>
                    <td>
                      <span className={statusPill(o.status)}>
                        {o.status.replace(/_/g, " ").toLowerCase()}
                      </span>
                    </td>
                    <td className="t-right mono">{o._count.items}</td>
                    <td className="t-right mono t-ink">{formatIdr(o.total.toString())}</td>
                    <td className="cell-sub">
                      {o.createdAt.toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageShell>
  );
}

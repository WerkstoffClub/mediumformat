import Link from "next/link";
import { PageShell } from "@/components/admin/PageShell";
import { prisma } from "@/lib/db";
import { formatIdr } from "@/lib/format";
import { POCreateForm } from "./POCreateForm";

export const dynamic = "force-dynamic";

function statusPill(status: string): string {
  if (status === "RECEIVED") return "pill pill-ok";
  if (status === "PARTIAL") return "pill pill-info";
  if (status === "CANCELLED") return "pill pill-danger";
  if (status === "ORDERED") return "pill pill-warn";
  return "pill";
}

export default async function PurchaseOrdersPage() {
  const [orders, locations] = await Promise.all([
    prisma.purchaseOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { _count: { select: { lines: true } }, location: true },
    }),
    prisma.location.findMany({ orderBy: { isDefault: "desc" }, select: { id: true, name: true } }),
  ]);

  return (
    <PageShell
      title="Purchase Order"
      description="Import a supplier invoice, then receive it to bump stock."
    >
      <POCreateForm locations={locations} />

      {orders.length === 0 ? (
        <div className="coming">No purchase orders yet.</div>
      ) : (
        <div className="panel">
          <div className="panel-hdr">
            <span className="panel-title">Purchase orders · {orders.length}</span>
          </div>
          <div className="atable-wrap">
            <table className="atable">
              <thead>
                <tr>
                  <th>PO #</th>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th className="t-right">Lines</th>
                  <th className="t-right">Subtotal</th>
                  <th>Location</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((po) => (
                  <tr key={po.id}>
                    <td className="mono t-ink">
                      <Link href={`/admin/purchase-orders/${po.id}`} className="link" style={{ color: "var(--ink)" }}>
                        {po.number}
                      </Link>
                    </td>
                    <td>{po.supplierName ?? "—"}</td>
                    <td>
                      <span className={statusPill(po.status)}>{po.status.toLowerCase()}</span>
                    </td>
                    <td className="t-right mono">{po._count.lines}</td>
                    <td className="t-right mono t-ink">{formatIdr(po.subtotalIdr.toString())}</td>
                    <td className="cell-sub">{po.location.name}</td>
                    <td className="cell-sub">
                      {po.createdAt.toLocaleDateString("en-US", {
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

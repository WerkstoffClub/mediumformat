import Link from "next/link";
import { PageShell } from "@/components/admin/PageShell";
import { prisma } from "@/lib/db";
import { artistsLabel } from "@/lib/catalog";
import type { StockMovementReason } from "@prisma/client";

export const dynamic = "force-dynamic";

function reasonPill(reason: StockMovementReason): string {
  switch (reason) {
    case "RECEIVING":
    case "TRANSFER_IN":
      return "pill pill-ok";
    case "SALE":
      return "pill pill-info";
    case "RETURN":
    case "STOCKTAKE":
    case "ADJUSTMENT":
      return "pill pill-warn";
    case "DAMAGE":
    case "WRITE_OFF":
    case "TRANSFER_OUT":
      return "pill pill-danger";
    default:
      return "pill";
  }
}

export default async function StockMovementsPage() {
  const movements = await prisma.stockMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      location: true,
      user: true,
      variant: { include: { product: { include: { release: true } } } },
    },
  });

  return (
    <PageShell
      title="Stock movements"
      description="Every on-hand change — receiving, sales, adjustments, transfers."
      actions={
        <Link href="/admin/inventory" className="btn-sec">
          ← Inventory
        </Link>
      }
    >
      {movements.length === 0 ? (
        <div className="coming">No stock movements yet. Receive a purchase order to see them here.</div>
      ) : (
        <div className="panel">
          <div className="panel-hdr">
            <span className="panel-title">Recent movements · {movements.length}</span>
          </div>
          <div className="atable-wrap">
            <table className="atable">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Item</th>
                  <th>Location</th>
                  <th>Reason</th>
                  <th className="t-right">Change</th>
                  <th>Reference</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const release = m.variant.product.release;
                  const artist = release ? artistsLabel(release.artistsJson) : null;
                  const isPO = m.refType === "PURCHASE_ORDER" && m.refId;
                  return (
                    <tr key={m.id}>
                      <td className="cell-sub">
                        {m.createdAt.toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td>
                        <div className="mono cell-sub">{m.variant.sku}</div>
                        <div className="t-ink">
                          {artist ? `${artist} — ` : ""}
                          {m.variant.product.title}
                        </div>
                      </td>
                      <td className="cell-sub">{m.location.name}</td>
                      <td>
                        <span className={reasonPill(m.reason)}>
                          {m.reason.replace(/_/g, " ").toLowerCase()}
                        </span>
                      </td>
                      <td
                        className="t-right mono"
                        style={{ color: m.delta >= 0 ? "var(--success)" : "var(--danger)" }}
                      >
                        {m.delta >= 0 ? `+${m.delta}` : m.delta}
                      </td>
                      <td className="cell-sub">
                        {isPO ? (
                          <Link href={`/admin/purchase-orders/${m.refId}`} className="link" style={{ color: "var(--ink)" }}>
                            {m.note ?? "Purchase order"}
                          </Link>
                        ) : (
                          m.note ?? (m.refType ?? "—")
                        )}
                      </td>
                      <td className="cell-sub">{m.user?.name ?? m.user?.email ?? "system"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageShell>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatIdr } from "@/lib/format";
import { PageShell } from "@/components/admin/PageShell";
import { Timeline } from "@/components/admin/Timeline";
import { assignLineVariant, receivePurchaseOrder, deletePurchaseOrder } from "../actions";

const PO_STEPS = ["Draft", "Ordered", "Partial", "Received"];
const PO_INDEX: Record<string, number> = { DRAFT: 0, ORDERED: 1, PARTIAL: 2, RECEIVED: 3 };

export const dynamic = "force-dynamic";

function statusPill(status: string): string {
  if (status === "RECEIVED") return "pill pill-ok";
  if (status === "PARTIAL") return "pill pill-info";
  if (status === "CANCELLED") return "pill pill-danger";
  if (status === "ORDERED") return "pill pill-warn";
  return "pill";
}

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      location: true,
      lines: { include: { variant: { include: { product: true } } } },
    },
  });
  if (!po) return notFound();

  const assignable = po.lines.some((l) => l.variantId && l.qtyReceived < l.qty);
  const totalUnits = po.lines.reduce((s, l) => s + l.qty, 0);
  const receivedUnits = po.lines.reduce((s, l) => s + l.qtyReceived, 0);

  return (
    <PageShell
      title={`Purchase Order ${po.number}`}
      description={`${po.supplierName ?? "No supplier"} · Receive into ${po.location.name}`}
      actions={
        <div className="greet-right">
          <span className={statusPill(po.status)}>{po.status.toLowerCase()}</span>
          <form action={receivePurchaseOrder}>
            <input type="hidden" name="poId" value={po.id} />
            <button type="submit" className="btn-primary" disabled={!assignable}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Receive stock
            </button>
          </form>
          <form action={deletePurchaseOrder}>
            <input type="hidden" name="id" value={po.id} />
            <button type="submit" className="btn-danger">Delete</button>
          </form>
        </div>
      }
    >
      {po.status === "CANCELLED" ? (
        <div className="banner-ok" style={{ borderColor: "rgba(239,68,68,.3)", background: "var(--danger-t)", color: "var(--danger)" }}>
          This purchase order is cancelled.
        </div>
      ) : (
        <Timeline steps={PO_STEPS} currentIndex={PO_INDEX[po.status] ?? 0} />
      )}

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-body" style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
          <div>
            <div className="kpi-lbl">Lines</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{po.lines.length}</div>
          </div>
          <div>
            <div className="kpi-lbl">Units received</div>
            <div style={{ fontSize: 18, fontWeight: 600 }} className="mono">
              {receivedUnits} / {totalUnits}
            </div>
          </div>
          <div>
            <div className="kpi-lbl">Subtotal</div>
            <div style={{ fontSize: 18, fontWeight: 600 }} className="mono">
              {formatIdr(po.subtotalIdr.toString())}
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hdr">
          <span className="panel-title">Lines · assign a SKU to each item, then Receive</span>
        </div>
        <div className="atable-wrap">
          <table className="atable">
            <thead>
              <tr>
                <th>Description</th>
                <th className="t-right">Qty</th>
                <th className="t-right">Recv</th>
                <th className="t-right">Unit cost</th>
                <th>Receive into (variant SKU)</th>
              </tr>
            </thead>
            <tbody>
              {po.lines.map((line) => (
                <tr key={line.id}>
                  <td className="t-ink">{line.description}</td>
                  <td className="t-right mono">{line.qty}</td>
                  <td className="t-right mono">
                    <span className={line.qtyReceived >= line.qty ? "pill pill-ok" : ""}>
                      {line.qtyReceived}
                    </span>
                  </td>
                  <td className="t-right mono">{formatIdr(line.unitCostIdr.toString())}</td>
                  <td>
                    {line.variant ? (
                      <div className="cell-sub" style={{ marginBottom: 6 }}>
                        Linked: <span className="mono t-ink">{line.variant.sku}</span> ·{" "}
                        {line.variant.product.title}
                      </div>
                    ) : null}
                    <form action={assignLineVariant} style={{ display: "flex", gap: 8 }}>
                      <input type="hidden" name="lineId" value={line.id} />
                      <input type="hidden" name="poId" value={po.id} />
                      <input
                        className="input"
                        name="sku"
                        defaultValue={line.variant?.sku ?? ""}
                        placeholder="SKU e.g. MF-000123"
                        style={{ maxWidth: 220 }}
                      />
                      <button type="submit" className="btn-sec">Link</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="cell-sub" style={{ marginTop: 14 }}>
        Receiving books a RECEIVING stock movement for each linked line and increases
        on-hand at {po.location.name}. Lines without a SKU are skipped.
      </p>
    </PageShell>
  );
}

import { PageShell } from "@/components/admin/PageShell";
import { getPosView } from "@/lib/pos";
import { formatIdr } from "@/lib/format";
import { addPosItem, setPosQty, removePosItem, clearPos, completeSale } from "./actions";

export const dynamic = "force-dynamic";

export default async function PosPage({
  searchParams,
}: {
  searchParams: Promise<{ notfound?: string }>;
}) {
  const { notfound } = await searchParams;
  const pos = await getPosView();

  return (
    <PageShell title="POS Checkout" description="Scan or type a SKU to ring up an in-store sale.">
      <div className="pos-grid">
        {/* Cart */}
        <div>
          <form action={addPosItem} className="pos-scan">
            <input
              className="input"
              name="sku"
              placeholder="Scan / type SKU and press Enter…"
              autoFocus
              autoComplete="off"
            />
            <button type="submit" className="btn-primary">Add</button>
          </form>
          {notfound && (
            <div className="banner-ok" style={{ borderColor: "rgba(239,68,68,.3)", background: "var(--danger-t)", color: "var(--danger)" }}>
              No active product with that SKU.
            </div>
          )}

          <div className="panel">
            <div className="panel-hdr">
              <span className="panel-title">Cart · {pos.count} item{pos.count === 1 ? "" : "s"}</span>
              {pos.items.length > 0 && (
                <form action={clearPos}>
                  <button className="link-danger" type="submit">Clear</button>
                </form>
              )}
            </div>
            {pos.items.length === 0 ? (
              <div className="panel-body"><p className="cell-sub">Cart is empty. Scan a SKU to begin.</p></div>
            ) : (
              <div className="atable-wrap">
                <table className="atable">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className="t-right">Unit</th>
                      <th>Qty</th>
                      <th className="t-right">Line</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {pos.items.map((it) => (
                      <tr key={it.variantId}>
                        <td>
                          <div className="mono cell-sub">{it.sku}</div>
                          <div className="t-ink">
                            {it.artist ? `${it.artist} — ` : ""}
                            {it.title}
                          </div>
                        </td>
                        <td className="t-right mono">{formatIdr(it.unitPrice)}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <form action={setPosQty}>
                              <input type="hidden" name="variantId" value={it.variantId} />
                              <input type="hidden" name="delta" value="-1" />
                              <button className="qty-btn" aria-label="Decrease">−</button>
                            </form>
                            <span className="qty-val">{it.qty}</span>
                            <form action={setPosQty}>
                              <input type="hidden" name="variantId" value={it.variantId} />
                              <input type="hidden" name="delta" value="1" />
                              <button className="qty-btn" aria-label="Increase">+</button>
                            </form>
                          </div>
                        </td>
                        <td className="t-right mono t-ink">{formatIdr(it.lineTotal)}</td>
                        <td className="t-right">
                          <form action={removePosItem}>
                            <input type="hidden" name="variantId" value={it.variantId} />
                            <button className="link-danger" type="submit">✕</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Tender */}
        <div className="panel">
          <div className="panel-hdr"><span className="panel-title">Payment</span></div>
          <div className="panel-body">
            <div className="kv"><span className="k">Subtotal</span><span className="v mono">{formatIdr(pos.subtotal)}</span></div>
            <div className="kv"><span className="k">PPN (tax)</span><span className="v mono">{formatIdr(pos.tax)}</span></div>
          </div>
          <div className="pos-total">
            <span>Total</span>
            <span>{formatIdr(pos.total)}</span>
          </div>
          <div className="panel-body">
            <form action={completeSale}>
              <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={pos.items.length === 0}>
                Complete cash sale
              </button>
            </form>
            <p className="cell-sub" style={{ marginTop: 10 }}>
              Records a paid POS order and decrements stock.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

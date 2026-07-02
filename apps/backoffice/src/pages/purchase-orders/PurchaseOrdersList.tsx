import { useEffect, useState } from 'react';
import { fmtDate, fmtIdr, getPurchaseOrders, type PurchaseOrderRow } from '../../api/ops';
import { EmptyRow, PageHeader, Paginator, SearchBox, StatusPill, tdCls, thCls } from '../../components/ui/Page';

export function PurchaseOrdersList() {
  const [rows, setRows] = useState<PurchaseOrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [suppliers, setSuppliers] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getPurchaseOrders({ q: q || undefined, page, limit: 50 })
      .then(r => { setRows(r.data); setTotal(r.total); setSuppliers(r.suppliers); })
      .finally(() => setLoading(false));
  }, [q, page]);

  return (
    <div>
      <PageHeader title="Purchase Orders" sub={`${total} bills · ${suppliers} suppliers synced from DealPOS`} />
      <div className="mb-4"><SearchBox value={q} onChange={v => { setQ(v); setPage(1); }} placeholder="Search PO # or supplier…" /></div>
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              {['PO', 'Supplier', 'Date', 'Due', 'Lines', 'Amount', 'Delivery', 'Payment'].map(h => <th key={h} className={thCls}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading && <EmptyRow cols={8}>Loading…</EmptyRow>}
            {!loading && rows.length === 0 && (
              <EmptyRow cols={8}>
                No purchase orders in DealPOS yet — supplier orders are tracked in the
                import spreadsheets until purchasing moves onto this platform.
              </EmptyRow>
            )}
            {rows.map(b => (
              <tr key={b.id} className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)]">
                <td className={`${tdCls} font-mono font-medium text-[var(--text-primary)]`}>{b.number}</td>
                <td className={tdCls}>{b.supplierName ?? '—'}</td>
                <td className={`${tdCls} text-[var(--text-muted)] whitespace-nowrap`}>{fmtDate(b.date)}</td>
                <td className={`${tdCls} text-[var(--text-muted)] whitespace-nowrap`}>{fmtDate(b.due)}</td>
                <td className={`${tdCls} font-mono text-right`}>{b._count?.lines ?? '—'}</td>
                <td className={`${tdCls} font-mono text-right whitespace-nowrap text-[var(--text-primary)]`}>{fmtIdr(b.amount)}</td>
                <td className={tdCls}><StatusPill value={b.delivery} /></td>
                <td className={tdCls}><StatusPill value={b.paymentStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginator page={page} limit={50} total={total} shown={rows.length} onPage={setPage} />
      </div>
    </div>
  );
}

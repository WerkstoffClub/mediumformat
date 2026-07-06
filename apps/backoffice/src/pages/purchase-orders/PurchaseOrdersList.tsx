import { useEffect, useState } from 'react';
import { fmtDate, fmtIdr, getPurchaseOrders, type PurchaseOrderRow } from '../../api/ops';
import { getSyncStatus, runSync } from '../../api/finance';
import { EmptyRow, PageHeader, Paginator, SearchBox, StatusPill, tdCls, thCls } from '../../components/ui/Page';

export function PurchaseOrdersList() {
  const [rows, setRows] = useState<PurchaseOrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [suppliers, setSuppliers] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [billsSync, setBillsSync] = useState<{ status: string; lastRunAt: string | null } | null>(null);

  const load = () => {
    setLoading(true);
    getPurchaseOrders({ q: q || undefined, page, limit: 50 })
      .then(r => { setRows(r.data); setTotal(r.total); setSuppliers(r.suppliers); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [q, page]);
  useEffect(() => {
    getSyncStatus()
      .then(s => { const b = s.entities.find(e => e.entity === 'bills'); setBillsSync(b ? { status: b.status, lastRunAt: b.lastRunAt } : null); })
      .catch(() => {});
  }, []);

  const onSync = async () => {
    setSyncing(true);
    try { await runSync(); load(); } finally {
      setSyncing(false);
      getSyncStatus().then(s => { const b = s.entities.find(e => e.entity === 'bills'); setBillsSync(b ? { status: b.status, lastRunAt: b.lastRunAt } : null); }).catch(() => {});
    }
  };

  const sub = total > 0
    ? `${total} bills · ${suppliers} suppliers synced from DealPOS`
    : billsSync?.lastRunAt
      ? `No bills returned by DealPOS on the last sync (${new Date(billsSync.lastRunAt).toLocaleString('en-GB')})`
      : 'Purchase orders are mirrored from DealPOS bills — run a sync to pull them in';

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        sub={sub}
        actions={
          <button
            onClick={onSync}
            disabled={syncing}
            className="text-[12px] px-3.5 py-2 rounded-[6px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><path d="M21 2v6h-6M3 22v-6h6" /><path d="M21 8a9 9 0 00-15-3.5L3 8M3 16a9 9 0 0015 3.5l3-3.5" /></svg>
            {syncing ? 'Syncing…' : 'Sync from DealPOS'}
          </button>
        }
      />
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
                {q
                  ? 'No purchase orders match your search.'
                  : 'No supplier bills mirrored from DealPOS yet. Purchasing still lives in DealPOS for now — run “Sync from DealPOS” to pull existing bills in, ahead of the custom purchasing flow.'}
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

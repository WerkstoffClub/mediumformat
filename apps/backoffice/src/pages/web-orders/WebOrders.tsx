import { Fragment, useCallback, useEffect, useState } from 'react';
import { fmtDate, fmtIdr } from '../../api/ops';
import { getWebOrders, setWebOrderStatus, WEB_ORDER_STATUS_LABEL, type WebOrder, type WebOrderStatus } from '../../api/webOrders';
import { EmptyRow, PageHeader, Paginator, SearchBox, StatusPill, tdCls, thCls } from '../../components/ui/Page';

const LIMIT = 25;
const FILTERS: Array<{ key: WebOrderStatus | 'ALL'; label: string }> = [
  { key: 'PENDING', label: 'Awaiting payment' },
  { key: 'PAID', label: 'Paid' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'ALL', label: 'All' },
];
/** Next step offered per status; cancelling returns the reserved stock. */
const NEXT: Record<WebOrderStatus, WebOrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPED', 'COMPLETED', 'CANCELLED'],
  SHIPPED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};
const ACTION_LABEL: Record<WebOrderStatus, string> = {
  PENDING: 'Reopen', PAID: 'Mark paid', SHIPPED: 'Mark shipped', COMPLETED: 'Mark completed', CANCELLED: 'Cancel order',
};

export function WebOrders() {
  const [filter, setFilter] = useState<WebOrderStatus | 'ALL'>('PENDING');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<WebOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getWebOrders({ status: filter === 'ALL' ? undefined : filter, q: q || undefined, page, limit: LIMIT })
      .then(r => { setRows(r.data); setTotal(r.total); })
      .catch(() => setError('Could not load web orders. Refresh to try again.'))
      .finally(() => setLoading(false));
  }, [filter, q, page]);

  useEffect(load, [load]);

  async function move(o: WebOrder, status: WebOrderStatus) {
    if (status === 'CANCELLED' && !window.confirm(`Cancel ${o.number}? Its records go back into stock. This cannot be undone.`)) return;
    setBusy(o.id);
    try {
      const updated = await setWebOrderStatus(o.id, status);
      setRows(rs => rs.map(r => (r.id === o.id ? updated : r)));
    } catch {
      setError(`Could not update ${o.number}. Try again.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader title="Web orders" sub="Placed on the storefront · paid by transfer or QRIS, confirmed here" />

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex gap-[2px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-[3px] flex-wrap" role="tablist">
          {FILTERS.map(f => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => { setFilter(f.key); setPage(1); setOpen(null); }}
              className={`text-[12px] font-medium px-3 py-1.5 rounded-[6px] transition-colors ${
                filter === f.key ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <SearchBox value={q} onChange={v => { setQ(v); setPage(1); }} placeholder="Order #, name, email, phone…" />
      </div>

      {error && <p role="alert" className="mb-3 text-[12px] px-3 py-2 rounded-md bg-[var(--danger-t)] text-[var(--danger)]">{error}</p>}

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-x-auto">
        <table className="w-full border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              {['Order no.', 'Customer', 'Items', 'Total', 'Placed', 'Fulfilment', 'Status'].map(h => (
                <th key={h} className={h === 'Items' || h === 'Total' ? `${thCls} text-right` : thCls}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <EmptyRow cols={7}>Loading…</EmptyRow>}
            {!loading && rows.length === 0 && <EmptyRow cols={7}>No web orders here yet.</EmptyRow>}
            {!loading && rows.map(o => (
              <Fragment key={o.id}>
                <tr
                  onClick={() => setOpen(open === o.id ? null : o.id)}
                  aria-expanded={open === o.id}
                  className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)] cursor-pointer"
                >
                  <td className={`${tdCls} font-mono font-medium text-[var(--text-primary)]`}>{o.number}</td>
                  <td className={`${tdCls} max-w-[200px] truncate`}>{o.customerName}</td>
                  <td className={`${tdCls} font-mono text-right`}>{o.lines.reduce((n, l) => n + l.qty, 0)}</td>
                  <td className={`${tdCls} font-mono text-right whitespace-nowrap text-[var(--text-primary)]`}>{fmtIdr(o.totalIdr)}</td>
                  <td className={`${tdCls} text-[var(--text-muted)] whitespace-nowrap`}>{fmtDate(o.createdAt)}</td>
                  <td className={tdCls}>{o.fulfilment === 'PICKUP' ? 'Pickup' : 'Delivery'}</td>
                  <td className={tdCls}><StatusPill value={WEB_ORDER_STATUS_LABEL[o.status]} /></td>
                </tr>
                {open === o.id && <OrderDetailRow order={o} busy={busy === o.id} onMove={s => move(o, s)} />}
              </Fragment>
            ))}
          </tbody>
        </table>
        <Paginator page={page} limit={LIMIT} total={total} shown={rows.length} onPage={setPage} />
      </div>
    </div>
  );
}

function OrderDetailRow({ order: o, busy, onMove }: { order: WebOrder; busy: boolean; onMove: (s: WebOrderStatus) => void }) {
  const wa = o.phone.replace(/[^0-9]/g, '').replace(/^0/, '62');
  return (
    <tr className="border-b border-[var(--border-sub)] bg-[var(--bg-base)]">
      <td colSpan={7} className="px-3.5 py-4">
        <div className="grid grid-cols-3 gap-6 max-md:grid-cols-1 text-[12px]">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.07em] text-[var(--text-faint)] font-semibold">Contact</span>
            <span className="text-[var(--text-primary)]">{o.customerName}</span>
            <a className="text-[var(--text-secondary)] hover:underline" href={`mailto:${o.email}`}>{o.email}</a>
            <a className="text-[var(--text-secondary)] hover:underline" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">{o.phone} · WhatsApp</a>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.07em] text-[var(--text-faint)] font-semibold">{o.fulfilment === 'PICKUP' ? 'Pick up in store' : 'Deliver to'}</span>
            {o.fulfilment === 'DELIVERY' && <span className="text-[var(--text-secondary)] whitespace-pre-line">{[o.address, [o.city, o.postalCode].filter(Boolean).join(' ')].filter(Boolean).join('\n')}</span>}
            {o.notes && <span className="text-[var(--text-muted)] italic">“{o.notes}”</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.07em] text-[var(--text-faint)] font-semibold">Items</span>
            {o.lines.map(l => (
              <div key={l.id} className="flex justify-between gap-3">
                <span className="text-[var(--text-secondary)] truncate">{l.artist} — {l.title}{l.qty > 1 ? ` × ${l.qty}` : ''}</span>
                <span className="font-mono text-[var(--text-primary)] whitespace-nowrap">{fmtIdr(l.unitPriceIdr * l.qty)}</span>
              </div>
            ))}
            {o.discountIdr > 0 && <div className="flex justify-between text-[var(--text-muted)]"><span>Voucher {o.voucherCode}</span><span className="font-mono">−{fmtIdr(o.discountIdr)}</span></div>}
            <div className="flex justify-between border-t border-[var(--border-sub)] pt-1.5 font-semibold text-[var(--text-primary)]"><span>Total</span><span className="font-mono">{fmtIdr(o.totalIdr)}</span></div>
          </div>
        </div>
        {NEXT[o.status].length > 0 && (
          <div className="flex gap-2 mt-4 justify-end">
            {NEXT[o.status].map(s => (
              <button
                key={s}
                disabled={busy}
                onClick={() => onMove(s)}
                className={s === 'CANCELLED'
                  ? 'text-[12px] px-3 py-2 rounded-[6px] border border-[var(--border)] text-[var(--danger)] hover:bg-[var(--danger-t)] disabled:opacity-50'
                  : 'text-[12px] px-3 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] font-semibold disabled:opacity-50 hover:opacity-90'}
              >
                {ACTION_LABEL[s]}
              </button>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}

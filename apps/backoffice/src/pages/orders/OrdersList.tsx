import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fmtDate, fmtIdr, getOrders, type OrderRow } from '../../api/ops';
import { getFilterOptions } from '../../api/finance';
import { ChannelPill, EmptyRow, PageHeader, Paginator, SearchBox, StatusPill, tdCls, thCls } from '../../components/ui/Page';

export function OrdersList() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { getFilterOptions().then(o => setTags(o.tags)).catch(() => {}); }, []);
  useEffect(() => {
    setLoading(true);
    getOrders({ q: q || undefined, tag: tag || undefined, page, limit: 50 })
      .then(r => { setRows(r.data); setTotal(r.total); })
      .finally(() => setLoading(false));
  }, [q, tag, page]);

  return (
    <div>
      <PageHeader title="Orders" sub={`${total} sales synced from DealPOS`} />
      <div className="flex items-center gap-2 mb-4">
        <SearchBox value={q} onChange={v => { setQ(v); setPage(1); }} placeholder="Search order # or customer…" />
        <select
          value={tag}
          onChange={e => { setTag(e.target.value); setPage(1); }}
          className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-2 py-1.5 text-[11px] text-[var(--text-primary)]"
        >
          <option value="">All channels</option>
          {tags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              {['Order', 'Date', 'Customer', 'Channel', 'Items', 'Amount', 'Payment', 'Fulfilment'].map(h => (
                <th key={h} className={thCls}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <EmptyRow cols={8}>Loading…</EmptyRow>}
            {!loading && rows.length === 0 && <EmptyRow cols={8}>No orders match.</EmptyRow>}
            {rows.map(o => (
              <tr key={o.id} className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)]">
                <td className={tdCls}>
                  <Link to={`/orders/${o.id}`} className="font-mono font-medium text-[var(--text-primary)] hover:underline">{o.number}</Link>
                </td>
                <td className={`${tdCls} text-[var(--text-muted)] whitespace-nowrap`}>{fmtDate(o.date)}</td>
                <td className={`${tdCls} max-w-[180px] truncate`}>{o.customerName || <span className="text-[var(--text-faint)]">Walk-in</span>}</td>
                <td className={tdCls}><ChannelPill tag={o.tag} /></td>
                <td className={`${tdCls} font-mono text-right`}>{o._count?.lines ?? '—'}</td>
                <td className={`${tdCls} font-mono text-right whitespace-nowrap text-[var(--text-primary)]`}>{fmtIdr(o.amount)}</td>
                <td className={tdCls}><StatusPill value={o.paymentStatus} /></td>
                <td className={tdCls}><StatusPill value={o.fulfillment} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginator page={page} limit={50} total={total} shown={rows.length} onPage={setPage} />
      </div>
    </div>
  );
}

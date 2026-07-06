import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { channelLabel, fmtDate, fmtIdr, getOrders, type OrderRow, type OrdersFilter } from '../../api/ops';
import { getFilterOptions } from '../../api/finance';
import { ChannelPill, EmptyRow, PageHeader, Paginator, SearchBox, StatusPill, tdCls, thCls } from '../../components/ui/Page';

/* mockup's status rail, mapped to the states DealPOS actually gives us */
const TABS = [
  { key: 'all', label: 'All', filter: {} as Partial<OrdersFilter>, dot: null },
  { key: 'unpaid', label: 'Awaiting settlement', filter: { payment: 'Unpaid' }, dot: 'var(--warning)' },
  { key: 'paid', label: 'Paid', filter: { payment: 'Paid' }, dot: 'var(--success)' },
  { key: 'unsent', label: 'Unfulfilled', filter: { fulfillment: 'Unsent' }, dot: 'var(--info)' },
  { key: 'sent', label: 'Fulfilled', filter: { fulfillment: 'Sent' }, dot: 'var(--success)' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function OrdersList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tab, setTab] = useState<TabKey>('all');
  const [counts, setCounts] = useState<Record<TabKey, number | null>>({ all: null, unpaid: null, paid: null, unsent: null, sent: null });
  const [unpaidSum, setUnpaidSum] = useState(0);
  const [today, setToday] = useState<{ orders: number; sum: number }>({ orders: 0, sum: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getFilterOptions().then(o => setTags(o.tags)).catch(() => {});
    // tab counts + summary figures (cheap limit-1 / capped queries)
    for (const t of TABS) {
      getOrders({ ...t.filter, limit: 1 })
        .then(r => setCounts(c => ({ ...c, [t.key]: r.total })))
        .catch(() => {});
    }
    getOrders({ payment: 'Unpaid', limit: 100 })
      .then(r => setUnpaidSum(r.data.reduce((sum, o) => sum + Number(o.amount), 0)))
      .catch(() => {});
    const day = iso(new Date());
    getOrders({ from: day, to: day, limit: 100 })
      .then(r => setToday({ orders: r.total, sum: r.data.reduce((sum, o) => sum + Number(o.amount), 0) }))
      .catch(() => {});
  }, []);

  const activeTab = TABS.find(t => t.key === tab) ?? TABS[0];

  useEffect(() => {
    setLoading(true);
    getOrders({ ...activeTab.filter, q: q || undefined, tag: tag || undefined, page, limit: 50 })
      .then(r => { setRows(r.data); setTotal(r.total); })
      .finally(() => setLoading(false));
  }, [activeTab, q, tag, page]);

  const summary = useMemo(() => [
    { label: 'Awaiting settlement', value: counts.unpaid ?? '—', meta: `${fmtIdr(unpaidSum)} owed by platforms`, dot: 'var(--warning)', tab: 'unpaid' as TabKey },
    { label: 'Today', value: today.orders, meta: `${fmtIdr(today.sum)} across all channels`, dot: 'var(--success)', tab: 'all' as TabKey },
    { label: 'Unfulfilled', value: counts.unsent ?? '—', meta: 'not yet handed over', dot: 'var(--info)', tab: 'unsent' as TabKey },
    { label: 'All orders', value: counts.all ?? '—', meta: 'synced from DealPOS', dot: 'var(--text-muted)', tab: 'all' as TabKey },
  ], [counts, unpaidSum, today]);

  return (
    <div>
      <PageHeader title="Orders" sub="Unified inbox — every channel, one queue" />

      {/* summary counters, mockup pattern */}
      <div className="grid grid-cols-4 gap-3 mb-4 max-md:grid-cols-2">
        {summary.map(card => (
          <button
            key={card.label}
            onClick={() => { setTab(card.tab); setPage(1); }}
            className="text-left bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] px-4 py-3 hover:border-[var(--text-muted)] transition-colors"
          >
            <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--text-muted)]">
              <span className="w-[7px] h-[7px] rounded-full" style={{ background: card.dot }} />{card.label}
            </span>
            <span className="block text-[22px] font-medium tracking-[-0.02em] text-[var(--text-primary)] mt-1.5 [font-variant-numeric:tabular-nums]">{card.value}</span>
            <span className="block text-[11px] text-[var(--text-faint)] mt-1">{card.meta}</span>
          </button>
        ))}
      </div>

      {/* status tab rail + search + channel filter */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex gap-[2px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-[3px] flex-wrap">
          {TABS.map(t => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => { setTab(t.key); setPage(1); }}
              className={`flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-[6px] transition-colors ${
                tab === t.key ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {t.dot && tab !== t.key && <span className="w-[6px] h-[6px] rounded-full" style={{ background: t.dot }} />}
              {t.label}
              <span className={`font-mono text-[10px] ${tab === t.key ? 'opacity-70' : 'text-[var(--text-faint)]'}`}>{counts[t.key] ?? '…'}</span>
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <SearchBox value={q} onChange={v => { setQ(v); setPage(1); }} placeholder="Order # or customer…" />
        <select
          value={tag}
          onChange={e => { setTag(e.target.value); setPage(1); }}
          className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-2 py-1.5 text-[11px] text-[var(--text-primary)]"
        >
          <option value="">All channels</option>
          {tags.map(t => <option key={t} value={t}>{channelLabel(t)}</option>)}
        </select>
      </div>

      {/* unified inbox table, mockup columns */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-x-auto">
        <table className="w-full border-collapse min-w-[820px]">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              {['Order no.', 'Customer', 'Channel', 'Items', 'Total', 'Date', 'Payment', 'Fulfilment', ''].map(h => (
                <th key={h} className={thCls}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <EmptyRow cols={9}>Loading…</EmptyRow>}
            {!loading && rows.length === 0 && <EmptyRow cols={9}>No orders match.</EmptyRow>}
            {rows.map(o => (
              <tr
                key={o.id}
                onClick={() => navigate(`/orders/${o.id}`)}
                className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                <td className={`${tdCls} font-mono font-medium text-[var(--text-primary)]`}>{o.number}</td>
                <td className={`${tdCls} max-w-[170px] truncate`}>{o.customerName || <span className="text-[var(--text-faint)]">Walk-in</span>}</td>
                <td className={tdCls}><ChannelPill tag={o.tag} /></td>
                <td className={`${tdCls} font-mono text-right`}>{o._count?.lines ?? '—'}</td>
                <td className={`${tdCls} font-mono text-right whitespace-nowrap text-[var(--text-primary)]`}>{fmtIdr(o.amount)}</td>
                <td className={`${tdCls} text-[var(--text-muted)] whitespace-nowrap`}>{fmtDate(o.date)}</td>
                <td className={tdCls}><StatusPill value={o.paymentStatus} /></td>
                <td className={tdCls}><StatusPill value={o.fulfillment} /></td>
                <td className={`${tdCls} text-[var(--text-faint)]`}>
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginator page={page} limit={50} total={total} shown={rows.length} onPage={setPage} />
      </div>
    </div>
  );
}

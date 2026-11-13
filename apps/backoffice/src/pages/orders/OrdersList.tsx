import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getOrders,
  getOrdersSummary,
  type OrderRow,
  type OrderStatus,
  type OrdersSummary,
} from '../../api/ops';
import { ChannelTag, PageHeader, TableFoot } from '../../components/ui/Page';
import { fmtNum, fmtRp, fmtRpShort } from '../../lib/idFormat';

/* mockup-orders.html — MF retail view. Status is derived server-side from the
   two DealPOS fields (payment + fulfilment); marketplace placeholder customers
   ("TikTok", "Shopee") are remapped to their channel, so those orders carry a
   channel and no customer. */

const LIMIT = 10; // mockup: 10 rows per page

type StatusKey = 'all' | OrderStatus;

const STATUS: Record<OrderStatus, { label: string; color: string; tint: string }> = {
  pending: { label: 'Pending', color: 'var(--warning)', tint: 'var(--warning-t)' },
  processing: { label: 'Processing', color: 'var(--info)', tint: 'var(--info-t)' },
  completed: { label: 'Completed', color: 'var(--success)', tint: 'var(--success-t)' },
  returned: { label: 'Returned', color: 'var(--danger)', tint: 'var(--danger-t)' },
};
const STATUS_ORDER: OrderStatus[] = ['pending', 'processing', 'completed', 'returned'];

function StatusPill({ status }: { status: OrderStatus | undefined }) {
  if (!status) return <span className="text-[11px] text-[var(--text-faint)]">—</span>;
  const s = STATUS[status];
  return (
    <span
      className="inline-flex items-center gap-[5px] text-[11px] font-medium px-[9px] py-0.5 rounded-full whitespace-nowrap tracking-[0.01em]"
      style={{ background: s.tint, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() === new Date().getFullYear() ? '' : ` ${d.getFullYear()}`}`;
};
const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  const date = fmtDay(iso);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
};

/** Customer cell: buyer name + email (or phone). Marketplace orders have no
 *  buyer in DealPOS — show which platform they came through instead. */
function Customer({ o, compact = false }: { o: OrderRow; compact?: boolean }) {
  const name = o.customerName?.trim();
  const sub = o.marketplace
    ? 'buyer not in DealPOS'
    : name
      ? o.customerEmail || o.customerMobile || 'no contact on file'
      : 'walk-in · POS';
  return (
    <span className="flex flex-col gap-0.5 min-w-0">
      <span className={`${compact ? 'font-medium' : ''} text-[13px] truncate ${name ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
        {name || (o.marketplace ? `${o.channel} buyer` : 'Walk-in')}
      </span>
      <span className="text-[11px] text-[var(--text-muted)] truncate">{sub}</span>
    </span>
  );
}

const exportCsv = (rows: OrderRow[]) => {
  const head = ['Order no.', 'Customer', 'Email', 'Channel', 'Items', 'Total (IDR)', 'Date', 'Status', 'Payment', 'Fulfilment'];
  const esc = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const body = rows.map(o =>
    [o.number, o.customerName ?? '', o.customerEmail ?? '', o.channel ?? '', o._count?.lines ?? '', Number(o.amount), o.date, o.status ?? '', o.paymentStatus ?? '', o.fulfillment ?? '']
      .map(esc).join(','),
  );
  const blob = new Blob([[head.map(esc).join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export function OrdersList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusKey>('all');
  const [channel, setChannel] = useState('');
  const [summary, setSummary] = useState<OrdersSummary | null>(null);
  const [loading, setLoading] = useState(false);

  // Status counts follow search + channel; channel chips follow search only.
  useEffect(() => {
    getOrdersSummary({ q: q || undefined, channel: channel || undefined })
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [q, channel]);

  useEffect(() => {
    setLoading(true);
    getOrders({
      q: q || undefined,
      channel: channel || undefined,
      status: status === 'all' ? undefined : status,
      page,
      limit: LIMIT,
    })
      .then(r => { setRows(r.data); setTotal(r.total); })
      .catch(() => { setRows([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [q, channel, status, page]);

  const by = summary?.byStatus;
  const count = (k: StatusKey) => (k === 'all' ? summary?.total : by?.[k].orders);
  const pick = (k: StatusKey) => { setStatus(k); setPage(1); };

  const cards: Array<{ key: StatusKey; label: string; dot: string; value: number | undefined; meta: React.ReactNode }> = [
    {
      key: 'pending', label: 'Pending', dot: 'var(--warning)', value: by?.pending.orders,
      meta: <><span className="font-medium text-[var(--text-primary)]">{fmtRpShort(by?.pending.amount)}</span> awaiting payment</>,
    },
    {
      key: 'processing', label: 'To ship', dot: 'var(--info)', value: by?.processing.orders,
      meta: <>paid · not yet sent</>,
    },
    {
      key: 'all', label: 'Today', dot: 'var(--success)', value: summary?.today.orders,
      meta: <><span className="font-medium text-[var(--text-primary)]">{fmtRpShort(summary?.today.amount)}</span> across channels</>,
    },
    {
      key: 'returned', label: 'Needs review', dot: 'var(--danger)', value: by?.returned.orders,
      meta: <>returned orders</>,
    },
  ];

  const channels = summary?.channels ?? [];
  const chanTotal = channels.reduce((t, c) => t + c.orders, 0);

  return (
    <div>
      <PageHeader
        title="Orders"
        sub="Unified inbox — MF retail, Peers ticket sales and Dealer POS sales, kept separate"
        actions={
          <button
            onClick={() => exportCsv(rows)}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 px-[13px] py-2 rounded-[6px] border border-[var(--border)] text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] disabled:opacity-40 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Export
          </button>
        }
      />

      {/* Order type view tabs — partner streams stay in their own module views */}
      <div role="tablist" aria-label="Order type" className="inline-flex gap-0.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-[3px] mb-4 max-w-full overflow-x-auto">
        <button role="tab" aria-selected className="inline-flex items-center gap-[7px] text-[13px] font-medium px-3.5 py-1.5 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] whitespace-nowrap">
          MF retail <span className="text-[11px] opacity-75 [font-variant-numeric:tabular-nums]">{fmtNum(summary?.total)}</span>
        </button>
        <Link to="/sales?tab=peers" role="tab" aria-selected={false} className="inline-flex items-center gap-[7px] text-[13px] font-medium px-3.5 py-1.5 rounded-[6px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] whitespace-nowrap">
          Peers · tickets
        </Link>
        <Link to="/sales?tab=dealers" role="tab" aria-selected={false} className="inline-flex items-center gap-[7px] text-[13px] font-medium px-3.5 py-1.5 rounded-[6px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] whitespace-nowrap">
          Dealers · POS
        </Link>
      </div>

      <div className="grid grid-cols-[210px_1fr] gap-4 items-start max-[1100px]:grid-cols-1">
        {/* Summary counters */}
        <div className="flex flex-col gap-2 max-[1100px]:grid max-[1100px]:grid-cols-4 max-[1100px]:gap-2.5 max-md:grid-cols-2">
          {cards.map(c => {
            const on = c.key !== 'all' && status === c.key;
            return (
              <button
                key={c.label}
                onClick={() => pick(c.key)}
                className={`text-left w-full rounded-[8px] border px-3.5 py-[13px] transition-colors ${
                  on ? 'border-[var(--accent)] bg-[var(--bg-overlay)]' : 'border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--text-muted)]'
                }`}
              >
                <span className="flex items-center gap-[7px] mb-2">
                  <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: c.dot }} />
                  <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--text-muted)]">{c.label}</span>
                </span>
                <span className="block text-[24px] font-medium leading-none tracking-[-0.02em] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
                  {c.value == null ? '—' : fmtNum(c.value)}
                </span>
                <span className="block text-[11px] text-[var(--text-secondary)] mt-1.5">{c.meta}</span>
              </button>
            );
          })}
        </div>

        {/* Main column */}
        <div className="min-w-0">
          {/* Toolbar: status pills, search, channel chips */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] px-3.5 py-3 mb-3.5">
            <div className="flex items-center gap-3 flex-wrap">
              <div role="tablist" aria-label="Filter by status" className="flex gap-1 flex-wrap">
                {(['all', ...STATUS_ORDER] as StatusKey[]).map(k => {
                  const on = status === k;
                  const n = count(k);
                  return (
                    <button
                      key={k}
                      role="tab"
                      aria-selected={on}
                      onClick={() => pick(k)}
                      className={`inline-flex items-center gap-[7px] text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                        on ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      {k !== 'all' && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS[k].color }} />}
                      {k === 'all' ? 'All' : STATUS[k].label}
                      <span className={`text-[11px] [font-variant-numeric:tabular-nums] ${on ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
                        {n == null ? '…' : fmtNum(n)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-2 bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[6px] px-3 py-1.5 min-w-[200px] max-w-[280px] flex-1">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input
                  className="bg-transparent text-[12px] outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] w-full"
                  placeholder="Order no. or customer…"
                  value={q}
                  onChange={e => { setQ(e.target.value); setPage(1); }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)] flex-wrap">
              <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--text-muted)] mr-0.5">Channel</span>
              {[{ channel: '', orders: chanTotal }, ...channels].map(c => {
                const on = channel === c.channel;
                return (
                  <button
                    key={c.channel || 'all'}
                    onClick={() => { setChannel(c.channel); setPage(1); }}
                    className={`inline-flex items-center gap-1.5 text-[11px] px-[11px] py-1 rounded-full border transition-colors ${
                      on
                        ? 'border-[var(--accent)] text-[var(--text-primary)] bg-[var(--bg-overlay)]'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {c.channel || 'All'}
                    <span className="text-[var(--text-muted)] [font-variant-numeric:tabular-nums]">{fmtNum(c.orders)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table (desktop) */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] overflow-hidden max-md:hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[820px]">
                <thead>
                  <tr>
                    {['Order no.', 'Customer', 'Channel', 'Items', 'Total', 'Date', 'Status', ''].map((h, i) => (
                      <th
                        key={h || i}
                        className={`text-[11px] uppercase tracking-[0.04em] text-[var(--text-muted)] font-semibold px-4 pt-3 pb-2.5 whitespace-nowrap ${i === 3 || i === 4 ? 'text-right' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={8} className="px-4 py-10 border-t border-[var(--border)] text-center text-[12px] text-[var(--text-faint)]">Loading…</td></tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-10 border-t border-[var(--border)] text-center text-[12px] text-[var(--text-faint)]">No orders match.</td></tr>
                  )}
                  {!loading && rows.map(o => (
                    <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} className="cursor-pointer [&:hover>td]:bg-[var(--bg-overlay)]">
                      <td className="px-4 py-[13px] border-t border-[var(--border)] text-[12px] font-medium text-[var(--text-primary)] whitespace-nowrap [font-variant-numeric:tabular-nums]">{o.number}</td>
                      <td className="px-4 py-[13px] border-t border-[var(--border)] max-w-[240px]"><Customer o={o} /></td>
                      <td className="px-4 py-[13px] border-t border-[var(--border)]"><ChannelTag channel={o.channel} /></td>
                      <td className="px-4 py-[13px] border-t border-[var(--border)] text-[12px] text-right text-[var(--text-secondary)] [font-variant-numeric:tabular-nums]">{o._count?.lines ?? '—'}</td>
                      <td className="px-4 py-[13px] border-t border-[var(--border)] text-[13px] font-medium text-right text-[var(--text-primary)] whitespace-nowrap [font-variant-numeric:tabular-nums]">{fmtRp(Number(o.amount))}</td>
                      <td className="px-4 py-[13px] border-t border-[var(--border)] text-[12px] text-[var(--text-muted)] whitespace-nowrap [font-variant-numeric:tabular-nums]">{fmtWhen(o.date)}</td>
                      <td className="px-4 py-[13px] border-t border-[var(--border)]"><StatusPill status={o.status} /></td>
                      <td className="px-4 py-[13px] border-t border-[var(--border)] text-right text-[var(--text-faint)]">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TableFoot page={page} limit={LIMIT} total={total} noun="orders" onPage={setPage} />
          </div>

          {/* Cards (mobile) */}
          <div className="hidden max-md:flex flex-col gap-2.5">
            {loading && <p className="py-8 text-center text-[12px] text-[var(--text-faint)]">Loading…</p>}
            {!loading && rows.length === 0 && <p className="py-8 text-center text-[12px] text-[var(--text-faint)]">No orders match.</p>}
            {!loading && rows.map(o => (
              <Link key={o.id} to={`/orders/${o.id}`} className="block bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[12px] font-medium text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">{o.number}</span>
                    <ChannelTag channel={o.channel} />
                  </div>
                  <StatusPill status={o.status} />
                </div>
                <div className="mt-2.5"><Customer o={o} compact /></div>
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                  {[
                    ['Items', String(o._count?.lines ?? '—')],
                    ['Date', fmtDay(o.date)],
                    ['Total', fmtRp(Number(o.amount))],
                  ].map(([k, v], i) => (
                    <div key={k} className={i === 2 ? 'text-right' : ''}>
                      <span className="block text-[10px] uppercase tracking-[0.04em] text-[var(--text-muted)] font-semibold">{k}</span>
                      <span className="block text-[12px] text-[var(--text-primary)] mt-0.5 [font-variant-numeric:tabular-nums]">{v}</span>
                    </div>
                  ))}
                </div>
              </Link>
            ))}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px]">
              <TableFoot page={page} limit={LIMIT} total={total} noun="orders" onPage={setPage} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

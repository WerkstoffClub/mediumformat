import { useEffect, useMemo, useState } from 'react';
import {
  channelColor,
  customerLabel,
  fmtIdrCompact,
  getCustomers,
  getCustomersSummary,
  type CustomerRow,
  type CustomersSummary,
} from '../../api/ops';
import { PageHeader } from '../../components/ui/Page';
import { CustomerDrawer } from './CustomerDrawer';

const LIMIT = 50;

type SegKey = 'all' | 'vip' | 'new';
const SEGMENTS: Array<{ key: SegKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'vip', label: 'VIP' },
  { key: 'new', label: 'New' },
];

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '—';

const memberSince = (iso: string | null) =>
  iso ? `Member since ${new Date(iso).getFullYear()}` : 'No join date';

const shortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';

function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  return (
    <span
      className="flex-shrink-0 rounded-full bg-[var(--bg-overlay)] border border-[var(--border)] flex items-center justify-center font-mono font-medium text-[var(--text-primary)]"
      style={{ width: size, height: size, fontSize: size >= 34 ? 12 : 11 }}
    >
      {initials(name)}
    </span>
  );
}

function SegBadge({ segment }: { segment: CustomerRow['segment'] }) {
  if (!segment) return null;
  const vip = segment === 'vip';
  return (
    <span
      className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.04em] px-[7px] py-px rounded-[4px] border ${
        vip ? 'text-[var(--text-primary)] border-[var(--accent)]' : 'text-[var(--text-muted)] border-[var(--border)]'
      }`}
    >
      {vip ? 'VIP' : 'New'}
    </span>
  );
}

function ChannelTag({ channel }: { channel: string | null }) {
  if (!channel) return <span className="text-[11px] text-[var(--text-faint)]">Direct</span>;
  return (
    <span className="inline-flex items-center gap-[5px] text-[11px] px-2 py-0.5 rounded-[4px] border border-[var(--border)] text-[var(--text-secondary)] whitespace-nowrap">
      <span className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: channelColor(channel) }} />
      {channel}
    </span>
  );
}

function Stat({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] px-[18px] py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--text-muted)]">{label}</p>
      <p className="font-mono text-[24px] font-medium tracking-[-0.02em] text-[var(--text-primary)] leading-none mt-2.5">{value}</p>
      {children && <p className="text-[12px] text-[var(--text-secondary)] mt-2.5 flex items-center gap-1.5">{children}</p>}
    </div>
  );
}

function Widget({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] overflow-hidden">
      <div className="flex items-center justify-between gap-2.5 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-overlay)]">
        <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--text-primary)]">{title}</span>
        {note && <span className="text-[11px] font-mono text-[var(--text-muted)]">{note}</span>}
      </div>
      {children}
    </div>
  );
}

function toCsv(rows: CustomerRow[]): string {
  const head = ['Name', 'Code', 'Email', 'Phone', 'Orders', 'Lifetime (IDR)', 'Last order', 'Acquired via', 'Segment'];
  const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const body = rows.map(c =>
    [c.name, c.code, c.email, c.mobile, c.orders, c.lifetime, c.lastOrderAt ?? '', c.channel ?? 'Direct', c.segment ?? '']
      .map(esc)
      .join(','),
  );
  return [head.map(esc).join(','), ...body].join('\n');
}

export function CustomersList() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [seg, setSeg] = useState<SegKey>('all');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<CustomersSummary | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    getCustomersSummary().then(setSummary).catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    setLoading(true);
    getCustomers({ q: q || undefined, page, limit: LIMIT, segment: seg === 'all' ? undefined : seg })
      .then(r => { setRows(r.data); setTotal(r.total); })
      .catch(() => { setRows([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [q, page, seg]);

  const segCounts = useMemo(
    () => ({ all: summary?.totalCustomers ?? 0, vip: summary?.vipCount ?? 0, new: summary?.newThisMonth ?? 0 }),
    [summary],
  );

  const acqMax = Math.max(...(summary?.acquisition.map(a => a.count) ?? [1]), 1);

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const from = total > 0 ? (page - 1) * LIMIT + 1 : 0;
  const to = Math.min(page * LIMIT, total);

  return (
    <div>
      <PageHeader
        title="Customers"
        sub={`${(summary?.totalCustomers ?? total).toLocaleString('en-GB')} people across every channel · Jakarta record shop`}
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={exportCsv}
              disabled={rows.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] border border-[var(--border)] text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] disabled:opacity-40 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Export CSV
            </button>
          </div>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3 mb-3.5 max-[1200px]:grid-cols-2 max-md:grid-cols-1">
        <Stat label="Total customers" value={(summary?.totalCustomers ?? 0).toLocaleString('en-GB')}>
          <span className="text-[var(--success)] inline-flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M18 15l-6-6-6 6" /></svg>
            <span className="font-mono">{summary?.newThisMonth ?? 0}</span>
          </span>
          <span className="text-[var(--text-muted)]">new this month</span>
        </Stat>
        <Stat label="Lifetime value · avg" value={fmtIdrCompact(summary?.avgLifetime)}>
          <span className="font-mono text-[var(--text-primary)]">{(summary?.avgOrders ?? 0).toFixed(1)}</span>
          <span className="text-[var(--text-muted)]">orders per customer</span>
        </Stat>
        <Stat label="VIP members" value={(summary?.vipCount ?? 0).toLocaleString('en-GB')}>
          <span className="font-mono text-[var(--text-primary)]">{summary?.vipRevenueShare ?? 0}%</span>
          <span className="text-[var(--text-muted)]">of net revenue</span>
        </Stat>
        <Stat label="Repeat rate" value={`${summary?.repeatRate ?? 0}%`}>
          <span className="text-[var(--text-muted)]">bought more than once</span>
        </Stat>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-3.5 flex-wrap">
        <div className="flex items-center gap-2.5 bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[6px] px-3 py-2 flex-1 min-w-[220px] max-w-[360px]">
          <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] text-[var(--text-muted)] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            className="bg-transparent text-[13px] outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] w-full"
            placeholder="Search name, email or phone…"
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {SEGMENTS.map(s => {
            const on = seg === s.key;
            return (
              <button
                key={s.key}
                onClick={() => { setSeg(s.key); setPage(1); }}
                className={`inline-flex items-center gap-[7px] text-[13px] font-medium px-3.5 py-1.5 rounded-full border transition-colors ${
                  on ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {s.label}
                <span className={`font-mono text-[11px] ${on ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
                  {segCounts[s.key].toLocaleString('en-GB')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Layout: table + side panel */}
      <div className="grid grid-cols-[1fr_300px] gap-3.5 items-start max-[1200px]:grid-cols-1">
        <Widget title="Customer list" note={`${total.toLocaleString('en-GB')} total · sorted by lifetime value`}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Customer', 'Email', 'Phone', 'Orders', 'Lifetime', 'Last order', 'Acquired via'].map((h, i) => (
                    <th
                      key={h}
                      className={`text-[11px] uppercase tracking-[0.04em] text-[var(--text-muted)] font-semibold px-4 pt-[11px] pb-2.5 whitespace-nowrap ${i >= 3 && i <= 4 ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-[12px] text-[var(--text-faint)]">Loading…</td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-[12px] text-[var(--text-faint)]">No customers match.</td></tr>
                )}
                {!loading && rows.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    className="border-t border-[var(--border)] cursor-pointer transition-colors hover:bg-[var(--bg-overlay)] hover:shadow-[inset_3px_0_0_var(--accent)]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-[11px] min-w-0">
                        <Avatar name={customerLabel(c.name)} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-primary)] truncate">
                            {customerLabel(c.name)} <SegBadge segment={c.segment} />
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] mt-px">{memberSince(c.joinDate)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[var(--text-secondary)] max-w-[220px] truncate">{c.email ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[var(--text-muted)] whitespace-nowrap">{c.mobile ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-right text-[var(--text-primary)]">{c.orders}</td>
                    <td className="px-4 py-3 font-mono text-[13px] font-medium text-right text-[var(--text-primary)] whitespace-nowrap">{fmtIdrCompact(c.lifetime)}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[var(--text-secondary)] whitespace-nowrap">{shortDate(c.lastOrderAt)}</td>
                    <td className="px-4 py-3"><ChannelTag channel={c.channel} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)]">
            <span>Showing {from}–{to} of {total.toLocaleString('en-GB')} customers</span>
            <div className="flex-1" />
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-2 py-0.5 border border-[var(--border)] rounded disabled:opacity-30">‹</button>
            <button disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)} className="px-2 py-0.5 border border-[var(--border)] rounded disabled:opacity-30">›</button>
          </div>
        </Widget>

        {/* Side panel */}
        <div className="flex flex-col gap-3.5">
          <Widget title="Top customers" note="by lifetime">
            <div className="flex flex-col">
              {(summary?.topCustomers ?? []).length === 0 && (
                <p className="px-4 py-6 text-[11px] text-[var(--text-faint)] text-center">No sales yet.</p>
              )}
              {summary?.topCustomers.map((c, i) => (
                <div
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className="flex items-center gap-[11px] px-4 py-3 border-t border-[var(--border)] first:border-t-0 cursor-pointer hover:bg-[var(--bg-overlay)] transition-colors"
                >
                  <span className="font-mono text-[12px] text-[var(--text-muted)] w-4 text-right flex-shrink-0">{i + 1}</span>
                  <Avatar name={customerLabel(c.name)} size={30} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-[var(--text-primary)] truncate">{customerLabel(c.name)}</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-px">{c.orders} orders · {c.channel ?? 'Direct'}</div>
                  </div>
                  <span className="font-mono text-[12px] font-medium text-[var(--text-primary)] flex-shrink-0">{fmtIdrCompact(c.lifetime)}</span>
                </div>
              ))}
            </div>
          </Widget>

          <Widget title="By acquisition channel" note="all time">
            <div>
              {(summary?.acquisition ?? []).length === 0 && (
                <p className="px-4 py-6 text-[11px] text-[var(--text-faint)] text-center">No channel data.</p>
              )}
              {summary?.acquisition.map(a => (
                <div key={a.channel} className="px-4 py-3 border-t border-[var(--border)] first:border-t-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
                      <span className="w-[6px] h-[6px] rounded-full" style={{ background: channelColor(a.channel === 'Direct' ? null : a.channel) }} />
                      {a.channel}
                    </span>
                    <span className="font-mono text-[13px] font-medium text-[var(--text-primary)]">{a.count.toLocaleString('en-GB')}</span>
                  </div>
                  <span className="block h-[5px] rounded-full bg-[var(--neutral-t)] overflow-hidden">
                    <span className="block h-full rounded-full bg-[var(--text-muted)]" style={{ width: `${(a.count / acqMax) * 100}%` }} />
                  </span>
                </div>
              ))}
            </div>
          </Widget>
        </div>
      </div>

      {selected && <CustomerDrawer customerId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

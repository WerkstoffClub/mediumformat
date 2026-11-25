import { useEffect, useMemo, useState } from 'react';
import {
  getCustomers,
  getCustomersAnalytics,
  getCustomersSummary,
  type CustomersAnalytics,
  type CustomerRow,
  type CustomersSummary,
} from '../../api/ops';
import { ChannelTag, PageHeader, Stat, TableFoot, Widget } from '../../components/ui/Page';
import { fmtNum, fmtRpShort } from '../../lib/idFormat';
import { BarChart, ShareList } from '../../components/ui/BarChart';
import { CustomerDrawer } from './CustomerDrawer';

const LIMIT = 10; // mockup: 10 rows per page

type SegKey = 'all' | 'vip' | 'new';
const SEGMENTS: Array<{ key: SegKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'vip', label: 'VIP' },
  { key: 'new', label: 'New' },
];

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '—';

const memberSince = (iso: string | null, segment: CustomerRow['segment']) =>
  segment === 'new' ? 'Joined this month' : iso ? `Member since ${new Date(iso).getFullYear()}` : 'No join date';

const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });

/** Analytics row: 12-month new vs returning buyers, order frequency, recency. */
function CustomerAnalytics({ data }: { data: CustomersAnalytics | null }) {
  const months = data?.months ?? [];
  const active = months.reduce((s, m) => s + m.activeCustomers, 0);
  const returning = months.reduce((s, m) => s + m.returningCustomers, 0);
  return (
    <div className="grid grid-cols-[2fr_1fr_1fr] gap-3.5 mt-3.5 max-[1200px]:grid-cols-1">
      <Widget title="Customer growth" note={active > 0 ? `12 months · ${Math.round((returning / active) * 100)}% returning` : '12 months'}>
        <div className="px-4 pt-4 pb-3.5">
          {months.length === 0 ? (
            <p className="py-10 text-center text-[11px] text-[var(--text-faint)]">{data ? 'Analytics unavailable.' : 'Loading…'}</p>
          ) : (
            <BarChart
              labels={months.map(m => monthLabel(m.month))}
              series={[
                { label: 'Returning buyers', values: months.map(m => m.returningCustomers) },
                { label: 'New buyers', values: months.map(m => m.newCustomers) },
              ]}
            />
          )}
        </div>
      </Widget>
      <Widget title="Order frequency" note="buyers">
        <ShareList rows={data?.frequency ?? []} empty="No sales yet." />
      </Widget>
      <Widget title="Recency" note="last order">
        <ShareList rows={data?.recency ?? []} empty="No sales yet." />
      </Widget>
    </div>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "9 Nov" this year, "9 Nov 2025" otherwise (mockup date style). */
const shortDate = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === new Date().getFullYear() ? base : `${base} ${d.getFullYear()}`;
};

function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  return (
    <span
      className="flex-shrink-0 rounded-full bg-[var(--bg-overlay)] border border-[var(--border)] flex items-center justify-center font-medium tracking-[0.02em] text-[var(--text-primary)]"
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
  const [analytics, setAnalytics] = useState<CustomersAnalytics | null>(null);

  useEffect(() => {
    getCustomersSummary().then(setSummary).catch(() => setSummary(null));
    getCustomersAnalytics().then(setAnalytics).catch(() => setAnalytics({ months: [], frequency: [], recency: [] }));
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

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const td = 'px-4 py-3 border-t border-[var(--border)] align-middle';

  return (
    <div>
      <PageHeader
        title="Customers"
        sub={`${fmtNum(summary?.totalCustomers ?? total)} people across every channel · Jakarta record shop`}
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={exportCsv}
              disabled={rows.length === 0}
              className="flex items-center gap-1.5 px-[13px] py-2 rounded-[6px] border border-[var(--border)] text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] disabled:opacity-40 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Export CSV
            </button>
          </div>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3 mb-3.5 max-[1200px]:grid-cols-2 max-md:grid-cols-1">
        <Stat label="Total customers" value={fmtNum(summary?.totalCustomers)}>
          <span className="text-[var(--success)] inline-flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M18 15l-6-6-6 6" /></svg>
            <span className="font-mono">{fmtNum(summary?.newThisMonth)}</span>
          </span>
          <span className="text-[var(--text-muted)]">new this month</span>
        </Stat>
        <Stat label="Lifetime value · avg" value={fmtRpShort(summary?.avgLifetime)}>
          <span className="font-mono text-[var(--text-primary)]">{(summary?.avgOrders ?? 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })}</span>
          <span className="text-[var(--text-muted)]">orders per customer</span>
        </Stat>
        <Stat label="VIP members" value={fmtNum(summary?.vipCount)}>
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
                  {fmtNum(segCounts[s.key])}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Layout: table + side panel */}
      <div className="grid grid-cols-[1fr_300px] gap-3.5 items-start max-[1200px]:grid-cols-1">
        <Widget title="Customer list" note={`${fmtNum(total)} total · sorted by lifetime value`}>
          <div className="overflow-x-auto">
            <table className="mf-stack-table w-full border-collapse">
              <thead>
                <tr>
                  {['Customer', 'Email', 'Phone', 'Orders', 'Lifetime', 'Last order', 'Acquired via'].map((h, i) => (
                    <th
                      key={h}
                      className={`${h === 'Phone' ? 'mf-col-phone ' : ''}text-[11px] uppercase tracking-[0.04em] text-[var(--text-muted)] font-semibold px-4 pt-[11px] pb-[9px] whitespace-nowrap ${i >= 3 && i <= 4 ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} className={`${td} py-10 text-center text-[12px] text-[var(--text-faint)]`}>Loading…</td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={7} className={`${td} py-10 text-center text-[12px] text-[var(--text-faint)]`}>No customers match.</td></tr>
                )}
                {!loading && rows.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    className="group cursor-pointer transition-shadow hover:shadow-[inset_3px_0_0_var(--accent)] [&:hover>td]:bg-[var(--bg-overlay)]"
                  >
                    <td className={td}>
                      <div className="flex items-center gap-[11px] min-w-0">
                        <Avatar name={c.name} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-primary)] truncate">
                            {c.name} <SegBadge segment={c.segment} />
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] mt-px">{memberSince(c.joinDate, c.segment)}</div>
                        </div>
                      </div>
                    </td>
                    <td data-k="Email" className={`${td} text-[12px] text-[var(--text-secondary)] max-w-[220px] truncate`}>{c.email ?? '—'}</td>
                    <td data-k="Phone" className={`mf-col-phone ${td} text-[12px] text-[var(--text-secondary)] whitespace-nowrap [font-variant-numeric:tabular-nums]`}>{c.mobile ?? '—'}</td>
                    <td data-k="Orders" className={`${td} text-[13px] text-right text-[var(--text-secondary)] [font-variant-numeric:tabular-nums]`}>{fmtNum(c.orders)}</td>
                    <td data-k="Lifetime" className={`${td} text-[13px] font-medium text-right text-[var(--text-primary)] whitespace-nowrap [font-variant-numeric:tabular-nums]`}>{fmtRpShort(c.lifetime)}</td>
                    <td data-k="Last order" className={`${td} text-[12px] text-[var(--text-secondary)] whitespace-nowrap`}>{shortDate(c.lastOrderAt)}</td>
                    <td data-k="Acquired via" className={td}><ChannelTag channel={c.channel} empty="Direct" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TableFoot page={page} limit={LIMIT} total={total} noun="customers" note="sorted by lifetime value" onPage={setPage} />
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
                  <span className="text-[12px] text-[var(--text-muted)] w-4 text-right flex-shrink-0 [font-variant-numeric:tabular-nums]">{i + 1}</span>
                  <Avatar name={c.name} size={30} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-[var(--text-primary)] truncate">{c.name}</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-px">{fmtNum(c.orders)} orders · {c.channel ?? 'Direct'}</div>
                  </div>
                  <span className="text-[12px] font-medium text-[var(--text-primary)] flex-shrink-0 [font-variant-numeric:tabular-nums]">{fmtRpShort(c.lifetime)}</span>
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
                <div key={a.channel} className="flex items-center justify-between px-4 py-3.5 border-t border-[var(--border)] first:border-t-0">
                  <span className="text-[12px] text-[var(--text-secondary)]">{a.channel}</span>
                  <span className="text-[13px] font-medium text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">{fmtNum(a.count)}</span>
                </div>
              ))}
            </div>
          </Widget>
        </div>
      </div>

      {/* Not in the mockup — kept below the list: 12-month trend, frequency, recency. */}
      <CustomerAnalytics data={analytics} />

      {selected && <CustomerDrawer customerId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

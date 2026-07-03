import { useEffect, useMemo, useState } from 'react';
import { getMargins, getPayments, type MarginRow, type PaymentRow } from '../../api/finance';
import { channelColor, fmtIdr, getChannels, type ChannelSummary } from '../../api/ops';
import { PageHeader, Panel, tdCls, thCls } from '../../components/ui/Page';

type PeriodKey = '30d' | '90d' | 'ytd' | 'all';
const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: '30d', label: '30D' }, { key: '90d', label: '90D' }, { key: 'ytd', label: 'YTD' }, { key: 'all', label: 'All time' },
];
const iso = (d: Date) => d.toISOString().slice(0, 10);

function range(key: PeriodKey): { from: string; to: string } {
  const now = new Date();
  const to = iso(now);
  if (key === 'all') return { from: '2000-01-01', to };
  if (key === 'ytd') return { from: iso(new Date(Date.UTC(now.getUTCFullYear(), 0, 1))), to };
  const days = key === '30d' ? 30 : 90;
  return { from: iso(new Date(now.getTime() - (days - 1) * 86400000)), to };
}

function ShareBar({ value, max, color }: { value: number; max: number; color?: string }) {
  return (
    <span className="block h-[6px] rounded-full bg-[var(--neutral-t,rgba(255,255,255,.06))] overflow-hidden w-full">
      <span className="block h-full rounded-full" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, background: color ?? 'var(--text-primary)' }} />
    </span>
  );
}

export function Analytics() {
  const [period, setPeriod] = useState<PeriodKey>('90d');
  const [channels, setChannels] = useState<ChannelSummary['channels']>([]);
  const [topReleases, setTopReleases] = useState<MarginRow[]>([]);
  const [categories, setCategories] = useState<MarginRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const win = useMemo(() => range(period), [period]);

  useEffect(() => {
    // 'all' spans >400 days which the finance endpoints reject; clamp to 400
    const clamped = period === 'all'
      ? { from: iso(new Date(Date.now() - 399 * 86400000)), to: win.to }
      : win;
    getChannels(win).then(r => setChannels(r.channels)).catch(() => setChannels([]));
    getMargins(clamped, 'release').then(r => setTopReleases(r.slice(0, 10))).catch(() => setTopReleases([]));
    getMargins(clamped, 'category').then(r => setCategories(r.slice(0, 8))).catch(() => setCategories([]));
    getPayments(clamped).then(setPayments).catch(() => setPayments([]));
  }, [win, period]);

  const chMax = Math.max(...channels.map(c => c.revenue), 1);
  const payMax = Math.max(...payments.map(p => p.amount), 1);
  const catMax = Math.max(...categories.map(c => c.revenue), 1);

  return (
    <div>
      <PageHeader
        title="Analytics"
        sub="How the shop sells — channels, catalogue and payment behaviour"
        actions={
          <div className="flex gap-[2px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-[6px] p-[3px]">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`text-[12px] font-medium px-[11px] py-[5px] rounded-[4px] transition-colors ${
                  period === p.key ? 'bg-[var(--bg-overlay)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
        <Panel title="Revenue by channel" note={`${channels.length} channels`}>
          <div className="p-4 space-y-3.5">
            {channels.length === 0 && <p className="text-[11px] text-[var(--text-faint)]">No sales in this window.</p>}
            {channels.map(c => (
              <div key={c.tag}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-primary)]">
                    <span className="w-2 h-2 rounded-full" style={{ background: channelColor(c.tag) }} />{c.tag}
                    <span className="text-[10px] text-[var(--text-muted)]">· {c.orders} orders</span>
                  </span>
                  <span className="font-mono text-[12px] text-[var(--text-primary)]">{fmtIdr(c.revenue)}</span>
                </div>
                <ShareBar value={c.revenue} max={chMax} color={channelColor(c.tag)} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Payment mix">
          <div className="p-4 space-y-3.5 max-h-[300px] overflow-y-auto">
            {payments.length === 0 && <p className="text-[11px] text-[var(--text-faint)]">No payments in this window.</p>}
            {payments.map(p => (
              <div key={p.method}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] text-[var(--text-primary)]">{p.method}<span className="text-[10px] text-[var(--text-muted)]"> · {p.count} txns</span></span>
                  <span className="font-mono text-[12px] text-[var(--text-secondary)]">{p.share ?? 0}%</span>
                </div>
                <ShareBar value={p.amount} max={payMax} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Top releases by revenue" note="top 10">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[var(--bg-overlay)]">
                {['Release', 'Revenue', 'Margin %'].map(h => <th key={h} className={thCls}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {topReleases.length === 0 && <tr><td colSpan={3} className={`${tdCls} text-[var(--text-faint)]`}>No line data.</td></tr>}
              {topReleases.map(r => (
                <tr key={r.group} className="border-b border-[var(--border-sub)]">
                  <td className={`${tdCls} max-w-[240px] truncate`} title={r.group}>{r.group}</td>
                  <td className={`${tdCls} font-mono text-right whitespace-nowrap text-[var(--text-primary)]`}>{fmtIdr(r.revenue)}</td>
                  <td className={`${tdCls} font-mono text-right ${r.marginPct != null && r.marginPct < 0 ? 'text-[var(--danger)]' : ''}`}>{r.marginPct != null ? `${r.marginPct}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Sales by category" note="genre from the catalogue">
          <div className="p-4 space-y-3.5">
            {categories.length === 0 && <p className="text-[11px] text-[var(--text-faint)]">No category data.</p>}
            {categories.map(c => (
              <div key={c.group}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] text-[var(--text-primary)] truncate">{c.group}<span className="text-[10px] text-[var(--text-muted)]"> · {c.unitsSold} units</span></span>
                  <span className="font-mono text-[12px] text-[var(--text-primary)]">{fmtIdr(c.revenue)}</span>
                </div>
                <ShareBar value={c.revenue} max={catMax} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

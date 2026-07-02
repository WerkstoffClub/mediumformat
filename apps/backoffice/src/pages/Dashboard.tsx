import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReleases } from '../api/inventory';
import { getSummary, getTimeseries, type FinanceSummary, type TimeseriesRow } from '../api/finance';
import { fmtIdr, getOrders, type OrderRow } from '../api/ops';
import { ChannelPill, Panel, StatusPill, tdCls, thCls } from '../components/ui/Page';
import type { Release } from '@mf/shared';

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 min-w-0">
      <p className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1">{label}</p>
      <p className="text-[15px] font-bold font-mono text-[var(--text-primary)] leading-none whitespace-nowrap overflow-hidden text-ellipsis" title={String(value)}>{value}</p>
      {sub && <p className="text-[9px] mt-1 text-[var(--text-faint)]">{sub}</p>}
    </div>
  );
}

function Spark({ rows }: { rows: TimeseriesRow[] }) {
  if (rows.length === 0) {
    return <div className="h-24 flex items-center justify-center text-[11px] text-[var(--text-faint)]">No sales in the last 30 days</div>;
  }
  const W = 560, H = 92;
  const max = Math.max(...rows.map(r => r.revenue), 1);
  const slot = W / rows.length;
  const bw = Math.min(slot - 2, 24);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" preserveAspectRatio="none" role="img" aria-label="Last 30 days revenue">
      {rows.map((r, i) => {
        const h = Math.max(1, (r.revenue / max) * (H - 6));
        return (
          <rect key={r.period} x={i * slot + (slot - bw) / 2} y={H - h} width={bw} height={h} fill="var(--text-muted)">
            <title>{`${r.period} · ${fmtIdr(r.revenue)}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

export default function Dashboard() {
  const [today, setToday] = useState<FinanceSummary | null>(null);
  const [month, setMonth] = useState<FinanceSummary | null>(null);
  const [series, setSeries] = useState<TimeseriesRow[]>([]);
  const [recent, setRecent] = useState<OrderRow[]>([]);
  const [lowStock, setLowStock] = useState<Release[]>([]);
  const [stockTotal, setStockTotal] = useState<number | null>(null);

  useEffect(() => {
    const now = new Date();
    const day = isoDay(now);
    const monthStart = isoDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
    const back30 = isoDay(new Date(now.getTime() - 29 * 86400000));
    getSummary({ from: day, to: day }).then(setToday).catch(() => {});
    getSummary({ from: monthStart, to: day }).then(setMonth).catch(() => {});
    getTimeseries({ from: back30, to: day }, 'day').then(setSeries).catch(() => {});
    getOrders({ limit: 7 }).then(r => setRecent(r.data)).catch(() => {});
    getReleases({ limit: 5, lowStockOnly: true }).then(r => { setLowStock(r.data); }).catch(() => {});
    getReleases({ limit: 1 }).then(r => setStockTotal(r.total)).catch(() => {});
  }, []);

  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[18px] font-black tracking-tight text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Live from the DealPOS mirror — synced data, real numbers</p>
        </div>
        <div className="text-right">
          <p className="text-[13px] text-[var(--text-secondary)]">
            {now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
          <p className="text-[24px] font-black font-mono text-[var(--text-primary)] leading-none mt-1">
            {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        <StatCard label="Today's revenue" value={today ? fmtIdr(today.revenue) : '—'} sub={today ? `${today.orders} orders` : undefined} />
        <StatCard label="This month" value={month ? fmtIdr(month.revenue) : '—'} sub={month ? `${month.orders} orders · margin ${month.grossMarginPct ?? '—'}%` : undefined} />
        <StatCard label="Items in stock" value={stockTotal ?? '—'} sub="releases in catalogue" />
        <StatCard label="Avg order value" value={month ? fmtIdr(month.avgOrderValue) : '—'} sub="month to date" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-3">
          <Panel title="Sales — last 30 days" actions={<Link to="/finance" className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline">Finance →</Link>}>
            <div className="p-1"><Spark rows={series} /></div>
          </Panel>

          <Panel title="Recent orders" actions={<Link to="/orders" className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline">All orders →</Link>}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--bg-overlay)]">
                  {['Order', 'Customer', 'Channel', 'Amount', 'Status'].map(h => <th key={h} className={thCls}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 && <tr><td colSpan={5} className={`${tdCls} text-[var(--text-faint)]`}>No orders yet.</td></tr>}
                {recent.map(o => (
                  <tr key={o.id} className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)]">
                    <td className={tdCls}><Link to={`/orders/${o.id}`} className="font-mono text-[var(--text-primary)] hover:underline">{o.number}</Link></td>
                    <td className={`${tdCls} max-w-[140px] truncate`}>{o.customerName || 'Walk-in'}</td>
                    <td className={tdCls}><ChannelPill tag={o.tag} /></td>
                    <td className={`${tdCls} font-mono text-right whitespace-nowrap`}>{fmtIdr(o.amount)}</td>
                    <td className={tdCls}><StatusPill value={o.paymentStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>

        <div className="space-y-3">
          <Panel title="Low stock" actions={<Link to="/inventory" className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline">Inventory →</Link>}>
            <div className="divide-y divide-[var(--border-sub)] px-1">
              {lowStock.length === 0 && <p className="text-[11px] text-[var(--text-faint)] py-2">Nothing running low.</p>}
              {lowStock.map(r => (
                <div key={r.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11.5px] text-[var(--text-primary)] truncate">{r.title}</p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">{r.artist}</p>
                  </div>
                  <span className={`font-mono text-[12px] font-bold ${r.stock === 0 ? 'text-[var(--danger)]' : 'text-[var(--warning)]'}`}>{r.stock}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Quick actions">
            <div className="grid grid-cols-2 gap-2 p-0.5">
              {[
                ['New release', '/inventory/new'],
                ['Sync DealPOS', '/finance'],
                ['Social feed', '/social'],
                ['Write post', '/blog/new'],
              ].map(([label, to]) => (
                <Link key={to} to={to} className="text-[11px] text-center px-2 py-2 rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

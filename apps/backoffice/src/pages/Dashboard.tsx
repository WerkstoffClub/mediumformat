import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getReleases } from '../api/inventory';
import { getSummary, getSyncStatus, getTimeseries, type FinanceSummary, type Granularity, type SyncEntityState, type TimeseriesRow } from '../api/finance';
import { fmtIdr, getOrders, type OrderRow } from '../api/ops';
import type { Release } from '@mf/shared';

/* ── period windows ─────────────────────────────────────────────── */
type PeriodKey = 'today' | '7d' | '30d' | '90d' | 'ytd';
const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: 'today', label: 'Today' }, { key: '7d', label: '7D' }, { key: '30d', label: '30D' },
  { key: '90d', label: '90D' }, { key: 'ytd', label: 'YTD' },
];
const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

function windows(key: PeriodKey): { from: string; to: string; prevFrom: string; prevTo: string; granularity: Granularity } {
  const now = new Date();
  const to = iso(now);
  const span = key === 'today' ? 1 : key === '7d' ? 7 : key === '30d' ? 30 : key === '90d' ? 90
    : Math.max(1, Math.round((now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 1)) / DAY) + 1);
  const from = key === 'ytd' ? iso(new Date(Date.UTC(now.getUTCFullYear(), 0, 1))) : iso(new Date(now.getTime() - (span - 1) * DAY));
  const prevTo = iso(new Date(new Date(from).getTime() - DAY));
  const prevFrom = iso(new Date(new Date(from).getTime() - span * DAY));
  const granularity: Granularity = span > 120 ? 'month' : span > 45 ? 'week' : 'day';
  return { from, to, prevFrom, prevTo, granularity };
}

/* ── tiny chart pieces ──────────────────────────────────────────── */
function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return <svg viewBox="0 0 70 26" className="w-[70px] h-[26px]" />;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 70},${24 - (v / max) * 20}`).join(' ');
  return (
    <svg viewBox="0 0 70 26" className="w-[70px] h-[26px]" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="var(--text-primary)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Delta({ current, previous, format }: { current: number; previous: number; format: (v: number) => string }) {
  if (previous <= 0) return <span className="text-[12px] text-[var(--text-muted)] font-mono">— vs prev</span>;
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return (
    <span className={`text-[12px] flex items-center gap-1 ${up ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" style={up ? undefined : { transform: 'rotate(180deg)' }}><path d="M18 15l-6-6-6 6"/></svg>
      <span className="font-mono" title={`prev ${format(previous)}`}>{up ? '+' : ''}{pct.toFixed(1)}%</span>
    </span>
  );
}

function RevenueChart({ current, previous }: { current: TimeseriesRow[]; previous: TimeseriesRow[] }) {
  const W = 560, H = 220, TOP = 20, BOT = 200;
  const max = Math.max(...current.map(r => r.revenue), ...previous.map(r => r.revenue), 1);
  const line = (rows: TimeseriesRow[]) =>
    rows.map((r, i) => `${rows.length > 1 ? (i / (rows.length - 1)) * W : W / 2},${BOT - (r.revenue / max) * (BOT - TOP)}`).join(' ');
  const cur = line(current);
  const prev = line(previous);
  const last = current[current.length - 1];
  const lastY = last ? BOT - (last.revenue / max) * (BOT - TOP) : BOT;
  return (
    <svg className="w-full block" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Revenue, this period versus previous">
      {[TOP, 80, 140, BOT].map(y => <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="var(--grid)" strokeWidth="1" />)}
      {previous.length > 1 && <polyline points={prev} fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" />}
      {current.length > 1 && (
        <>
          <polygon points={`${cur} ${W},${BOT} 0,${BOT}`} fill="var(--area-top)" opacity="0.6" />
          <polyline points={cur} fill="none" stroke="var(--text-primary)" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
        </>
      )}
      {last && <circle cx={W} cy={lastY} r="4.5" fill="var(--success)" stroke="var(--bg-surface)" strokeWidth="2" />}
      {current.length === 0 && <text x={W / 2} y={H / 2} textAnchor="middle" fill="var(--text-faint)" fontSize="12">No sales in this period</text>}
    </svg>
  );
}

/* ── alerts ─────────────────────────────────────────────────────── */
interface Alert { severity: 'warn' | 'danger' | 'info'; title: string; meta: string; fig?: string; figClass?: string; to: string; }
const BAR: Record<Alert['severity'], string> = { warn: 'bg-[var(--warning)]', danger: 'bg-[var(--danger)]', info: 'bg-[var(--info)]' };

/* ── page ───────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [prevSummary, setPrevSummary] = useState<FinanceSummary | null>(null);
  const [series, setSeries] = useState<TimeseriesRow[]>([]);
  const [prevSeries, setPrevSeries] = useState<TimeseriesRow[]>([]);
  const [lowStock, setLowStock] = useState<{ items: Release[]; total: number }>({ items: [], total: 0 });
  const [unpaid, setUnpaid] = useState<{ rows: OrderRow[]; total: number }>({ rows: [], total: 0 });
  const [syncErrors, setSyncErrors] = useState<SyncEntityState[]>([]);

  const win = useMemo(() => windows(period), [period]);

  useEffect(() => {
    getSummary({ from: win.from, to: win.to }).then(setSummary).catch(() => setSummary(null));
    getSummary({ from: win.prevFrom, to: win.prevTo }).then(setPrevSummary).catch(() => setPrevSummary(null));
    getTimeseries({ from: win.from, to: win.to }, win.granularity).then(setSeries).catch(() => setSeries([]));
    getTimeseries({ from: win.prevFrom, to: win.prevTo }, win.granularity).then(setPrevSeries).catch(() => setPrevSeries([]));
  }, [win]);

  useEffect(() => {
    getReleases({ lowStockOnly: true, limit: 3 }).then(r => setLowStock({ items: r.data, total: r.total })).catch(() => {});
    getOrders({ payment: 'Unpaid', limit: 50 }).then(r => setUnpaid({ rows: r.data, total: r.total })).catch(() => {});
    getSyncStatus().then(s => setSyncErrors(s.entities.filter(e => e.status === 'error'))).catch(() => {});
  }, []);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] ?? '';

  const unpaidSum = unpaid.rows.reduce((sum, o) => sum + Number(o.amount), 0);
  const alerts: Alert[] = [
    ...(syncErrors.length > 0 ? [{
      severity: 'danger' as const,
      title: `DealPOS sync failing — ${syncErrors.length} ${syncErrors.length === 1 ? 'entity' : 'entities'}`,
      meta: syncErrors.map(e => e.entity).join(' · '),
      to: '/finance',
    }] : []),
    ...(lowStock.total > 0 ? [{
      severity: 'warn' as const,
      title: `Low stock — ${lowStock.total} release${lowStock.total === 1 ? '' : 's'}`,
      meta: lowStock.items.map(r => r.title).slice(0, 3).join(' · '),
      fig: lowStock.items[0] ? fmtIdr(lowStock.items[0].priceIdr) : undefined,
      figClass: 'text-[var(--warning)]',
      to: '/inventory?q=',
    }] : []),
    ...(unpaid.total > 0 ? [{
      severity: 'info' as const,
      title: `${unpaid.total} order${unpaid.total === 1 ? '' : 's'} awaiting settlement`,
      meta: 'Marketplace payouts (TikTok / Shopee) settle on platform schedule',
      fig: fmtIdr(unpaidSum),
      figClass: 'text-[var(--info)]',
      to: '/orders',
    }] : []),
  ];

  const aov = series.map(r => (r.orders > 0 ? r.revenue / r.orders : 0));

  const kpis = summary && [
    { label: 'Gross revenue', value: fmtIdr(summary.revenue), cur: summary.revenue, prev: prevSummary?.revenue ?? 0, spark: series.map(r => r.revenue), fmt: fmtIdr },
    { label: 'Orders', value: String(summary.orders), cur: summary.orders, prev: prevSummary?.orders ?? 0, spark: series.map(r => r.orders), fmt: (v: number) => String(Math.round(v)) },
    { label: 'Avg ticket', value: fmtIdr(summary.avgOrderValue), cur: summary.avgOrderValue, prev: prevSummary?.avgOrderValue ?? 0, spark: aov, fmt: fmtIdr },
    { label: 'Gross margin', value: summary.grossMarginPct != null ? `${summary.grossMarginPct.toFixed(1)}%` : '—', cur: summary.grossMarginPct ?? 0, prev: prevSummary?.grossMarginPct ?? 0, spark: series.map(r => Math.max(r.margin, 0)), fmt: (v: number) => `${v.toFixed(1)}%` },
  ];

  const tabs = [['Dashboard', '/dashboard'], ['Orders', '/orders'], ['Inventory', '/inventory'], ['Customers', '/customers'], ['Finance', '/finance'], ['Channels', '/channels']] as const;

  return (
    <div>
      {/* tab strip — quick navigation, mockup chrome */}
      <div className="max-md:hidden inline-flex gap-[2px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-[3px] mb-6 flex-wrap" role="tablist" aria-label="Sections">
        {tabs.map(([label, to]) => (
          <button
            key={to}
            role="tab"
            aria-selected={to === '/dashboard'}
            onClick={() => to !== '/dashboard' && navigate(to)}
            className={`text-[13px] font-medium px-3.5 py-1.5 rounded-[6px] transition-colors ${
              to === '/dashboard' ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* greeting */}
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
            {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="text-[30px] font-semibold tracking-[-0.03em] leading-[1.1] text-[var(--text-primary)]">{greeting}{firstName ? `, ${firstName}` : ''}</h1>
          <p className="text-[14px] text-[var(--text-muted)] mt-[7px]">
            {unpaid.total} awaiting settlement · {lowStock.total} low stock · {alerts.length} item{alerts.length === 1 ? '' : 's'} need attention
          </p>
        </div>
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
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5 max-md:gap-2.5 mb-3.5">
        {(kpis || [null, null, null, null]).map((kpi, i) => (
          <div key={kpi?.label ?? i} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] px-[18px] py-4 min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)] mb-3">{kpi?.label ?? '…'}</p>
            <p className="text-[27px] font-medium tracking-[-0.02em] text-[var(--text-primary)] leading-none [font-variant-numeric:tabular-nums] whitespace-nowrap overflow-hidden text-ellipsis" title={kpi?.value}>
              {kpi?.value ?? '—'}
            </p>
            <div className="flex items-end justify-between gap-2 mt-3.5">
              {kpi ? <Delta current={kpi.cur} previous={kpi.prev} format={kpi.fmt} /> : <span />}
              {kpi && <Spark values={kpi.spark} />}
            </div>
          </div>
        ))}
      </div>

      {/* main grid */}
      <div className="grid grid-cols-[1.55fr_1fr] gap-3.5 max-[1100px]:grid-cols-1">
        {/* Revenue */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-2 px-4 py-3 bg-[var(--bg-overlay)] border-b border-[var(--border)]">
            <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--text-primary)]">Revenue</span>
            <div className="flex items-center gap-3.5 text-[11px] text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-2 rounded-[2px] bg-[var(--text-primary)]" />This period</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3.5 border-t-2 border-dashed border-[var(--text-muted)]" />Previous</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--success)]" />Latest</span>
            </div>
          </div>
          <div className="p-[18px] pb-3.5 flex-1">
            <div className="flex gap-8 mb-4">
              {[
                ['This period', summary ? fmtIdr(summary.revenue) : '—', ''],
                ['Previous', prevSummary ? fmtIdr(prevSummary.revenue) : '—', ''],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)] mb-1.5">{label}</p>
                  <p className="text-[18px] font-medium tracking-[-0.02em] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">{value}</p>
                </div>
              ))}
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)] mb-1.5">Delta</p>
                {summary && prevSummary
                  ? <Delta current={summary.revenue} previous={prevSummary.revenue} format={fmtIdr} />
                  : <p className="text-[18px] text-[var(--text-faint)]">—</p>}
              </div>
            </div>
            <RevenueChart current={series} previous={prevSeries} />
            <div className="flex justify-between mt-1.5 px-0.5">
              {series.length > 1 && [series[0], series[Math.floor(series.length / 2)], series[series.length - 1]].map((r, i) => (
                <span key={i} className="text-[10px] text-[var(--text-muted)] font-mono">{r.period}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Needs attention */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-2 px-4 py-3 bg-[var(--bg-overlay)] border-b border-[var(--border)]">
            <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--text-primary)]">Needs attention</span>
            <Link to="/orders" className="text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">All orders →</Link>
          </div>
          <div className="px-[18px] py-3 flex-1">
            <p className="text-[11px] text-[var(--text-muted)] mb-1.5">{alerts.length} item{alerts.length === 1 ? '' : 's'} · unresolved</p>
            {alerts.length === 0 && (
              <p className="text-[12px] text-[var(--text-faint)] py-6 text-center">All clear — nothing needs attention.</p>
            )}
            {alerts.map(alert => (
              <Link key={alert.title} to={alert.to} className="flex gap-3 py-[13px] border-b border-[var(--border)] last:border-b-0 items-start group">
                <span className={`w-[3px] self-stretch rounded-full min-h-[32px] flex-shrink-0 ${BAR[alert.severity]}`} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-medium text-[var(--text-primary)] leading-[1.4] group-hover:underline">{alert.title}</span>
                  <span className="block text-[11px] text-[var(--text-muted)] mt-1 leading-[1.5] truncate">{alert.meta}</span>
                </span>
                {alert.fig && <span className={`text-[13px] font-medium font-mono whitespace-nowrap ${alert.figClass ?? ''}`}>{alert.fig}</span>}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

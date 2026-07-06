import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  downloadExport,
  getFilterOptions,
  getMargins,
  getPayments,
  getSummary,
  getSyncStatus,
  getTimeseries,
  runSync,
  type ExportReport,
  type FinanceFilters,
  type FinanceSummary,
  type Granularity,
  type MarginGroup,
  type MarginRow,
  type PaymentRow,
  type SyncEntityState,
  type TimeseriesRow,
} from '../../api/finance';
import { channelColor, channelLabel, fmtIdr, getChannels, type ChannelSummary } from '../../api/ops';
import { getLocations, type Location } from '../../api/locations';

const fmtRp = fmtIdr;
const fmtPct = (v: number | null) => (v == null ? '—' : `${v.toFixed(1)}%`);
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

type PresetKey = 'today' | '7d' | 'mtd' | 'qtd' | 'ytd';
const PRESETS: Array<{ key: PresetKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7D' },
  { key: 'mtd', label: 'MTD' },
  { key: 'qtd', label: 'QTD' },
  { key: 'ytd', label: 'YTD' },
];

function presetRange(key: PresetKey): { from: string; to: string } {
  const now = new Date();
  const to = isoDay(now);
  switch (key) {
    case 'today': return { from: to, to };
    case '7d':    return { from: isoDay(new Date(now.getTime() - 6 * 86400000)), to };
    case 'mtd':   return { from: isoDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))), to };
    case 'qtd':   return { from: isoDay(new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1))), to };
    case 'ytd':   return { from: isoDay(new Date(Date.UTC(now.getUTCFullYear(), 0, 1))), to };
  }
}

const selectCls =
  'bg-[var(--bg-surface)] border border-[var(--border)] rounded-[6px] px-2.5 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)] transition-colors';

/* ── Panel shell ─────────────────────────────────────────────── */
function Panel({
  title, note, actions, children, className = '',
}: {
  title: string; note?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] overflow-hidden flex flex-col ${className}`}>
      <div className="flex items-center justify-between gap-2.5 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-overlay)]">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--text-primary)]">{title}</h3>
        <div className="flex items-center gap-2">
          {note && <span className="text-[11px] font-mono text-[var(--text-muted)]">{note}</span>}
          {actions}
        </div>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  );
}

function ExportBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-[11px] px-2 py-1 rounded-[5px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors"
    >
      Export CSV
    </button>
  );
}

/* ── KPI strip: one surface, hairline-divided, revenue emphasised ── */
function KpiStrip({ summary }: { summary: FinanceSummary | null }) {
  const cells: Array<{ label: string; value: string; sub?: string; hero?: boolean }> = [
    { label: 'Revenue', value: summary ? fmtRp(summary.revenue) : '—', sub: summary ? `${summary.unitsSold.toLocaleString('en-GB')} units sold` : undefined, hero: true },
    { label: 'Orders', value: summary ? summary.orders.toLocaleString('en-GB') : '—', sub: summary ? `AOV ${fmtRp(summary.avgOrderValue)}` : undefined },
    { label: 'COGS', value: summary ? fmtRp(summary.cogs) : '—', sub: 'cost of goods' },
    { label: 'Gross margin', value: summary ? fmtRp(summary.grossMargin) : '—', sub: summary ? fmtPct(summary.grossMarginPct) : undefined },
  ];
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] grid grid-cols-[1.4fr_1fr_1fr_1fr] max-md:grid-cols-2 divide-x divide-[var(--border-sub)] max-md:divide-x-0 max-md:divide-y">
      {cells.map(c => (
        <div key={c.label} className="px-4 py-3.5 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">{c.label}</p>
          <p
            className={`font-mono font-medium tracking-[-0.02em] text-[var(--text-primary)] leading-none mt-2 whitespace-nowrap overflow-hidden text-ellipsis ${c.hero ? 'text-[27px]' : 'text-[19px]'}`}
            title={c.value}
          >
            {c.value}
          </p>
          {c.sub && <p className="text-[11px] text-[var(--text-faint)] mt-1.5">{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}

/* ── Revenue over time: revenue bars with a margin overlay ─────── */
function RevenueChart({ rows }: { rows: TimeseriesRow[] }) {
  if (rows.length === 0) {
    return <div className="h-40 flex items-center justify-center text-[11px] text-[var(--text-faint)]">No sales in this range</div>;
  }
  const W = 760, H = 168, PADX = 6, TOP = 14, BASE = 20;
  const max = Math.max(...rows.map(r => r.revenue), 1);
  const slot = (W - PADX * 2) / rows.length;
  const bw = Math.min(slot - 3, 46);
  const inset = (slot - bw) / 2;
  const plot = H - TOP - BASE;
  return (
    <div className="p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40" preserveAspectRatio="none" role="img" aria-label="Revenue over time">
        <line x1={0} y1={H - BASE} x2={W} y2={H - BASE} stroke="var(--border)" strokeWidth={1} />
        {rows.map((r, i) => {
          const h = Math.max(1, (r.revenue / max) * plot);
          const mh = Math.max(0, (Math.max(r.margin, 0) / max) * plot);
          const x = PADX + i * slot + inset;
          return (
            <g key={r.period}>
              <rect x={x} y={H - BASE - h} width={Math.max(1, bw)} height={h} rx={1.5} fill="var(--text-faint)">
                <title>{`${r.period} · ${fmtRp(r.revenue)} · ${r.orders} orders`}</title>
              </rect>
              <rect x={x} y={H - BASE - mh} width={Math.max(1, bw)} height={mh} rx={1.5} fill="var(--text-primary)">
                <title>{`${r.period} margin ${fmtRp(r.margin)}`}</title>
              </rect>
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between items-center mt-2 text-[10px] font-mono text-[var(--text-faint)]">
        <span>{rows[0].period}</span>
        <span className="flex items-center gap-3.5">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 inline-block rounded-sm bg-[var(--text-faint)]" /> Revenue</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 inline-block rounded-sm bg-[var(--text-primary)]" /> Margin</span>
        </span>
        <span>{rows[rows.length - 1].period}</span>
      </div>
    </div>
  );
}

function ShareBar({ value, max, color }: { value: number; max: number; color?: string }) {
  return (
    <span className="block h-[6px] rounded-full bg-[var(--neutral-t)] overflow-hidden">
      <span className="block h-full rounded-full" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, background: color ?? 'var(--text-muted)' }} />
    </span>
  );
}

const th = 'text-left text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)] font-semibold px-4 pb-2 pt-1';
const td = 'px-4 py-2 text-[11.5px] border-t border-[var(--border-sub)]';
const tdNum = `${td} font-mono text-right tabular-nums`;

const MARGIN_GROUPS: Array<{ key: MarginGroup; label: string; head: string }> = [
  { key: 'release', label: 'By release', head: 'Release' },
  { key: 'category', label: 'By category', head: 'Category' },
  { key: 'tag', label: 'By channel', head: 'Channel' },
];

export function SalesOverview({ onLastSync }: { onLastSync?: (label: string | null) => void }) {
  const [range, setRange] = useState(() => presetRange('mtd'));
  const [activePreset, setActivePreset] = useState<PresetKey | null>('mtd');
  const [outlet, setOutlet] = useState('');
  const [tag, setTag] = useState('');
  const [event, setEvent] = useState('');
  const [events, setEvents] = useState<Location[]>([]);
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [groupBy, setGroupBy] = useState<MarginGroup>('release');

  const [options, setOptions] = useState<{ outlets: string[]; tags: string[] }>({ outlets: [], tags: [] });
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [series, setSeries] = useState<TimeseriesRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [margins, setMargins] = useState<MarginRow[]>([]);
  const [channels, setChannels] = useState<ChannelSummary['channels']>([]);
  const [sync, setSync] = useState<{ running: boolean; entities: SyncEntityState[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters: FinanceFilters = useMemo(
    () => ({ ...range, outlet: outlet || undefined, tag: tag || undefined }),
    [range, outlet, tag],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, t, p, m] = await Promise.all([
        getSummary(filters),
        getTimeseries(filters, granularity),
        getPayments(filters),
        getMargins(filters, groupBy),
      ]);
      setSummary(s); setSeries(t); setPayments(p); setMargins(m);
    } catch {
      setError('Could not load sales data. Run a DealPOS sync first, or check the API.');
    } finally {
      setLoading(false);
    }
  }, [filters, granularity, groupBy]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    getChannels({ from: filters.from, to: filters.to }).then(r => setChannels(r.channels)).catch(() => setChannels([]));
  }, [filters.from, filters.to]);
  useEffect(() => {
    getFilterOptions().then(setOptions).catch(() => {});
    getSyncStatus().then(setSync).catch(() => {});
    getLocations().then(ls => setEvents(ls.filter(l => l.kind === 'TEMPORARY'))).catch(() => {});
  }, []);

  /** Picking an event scopes the range to its run window and applies its
   *  DealPOS match key (tag) when one is set. Manually changing the range or
   *  channel clears the event selection to keep the filter bar honest. */
  const pickEvent = (id: string) => {
    setEvent(id);
    const ev = events.find(e => e.id === id);
    if (!ev) return;
    if (ev.startDate) {
      setRange({ from: ev.startDate.slice(0, 10), to: (ev.endDate ?? ev.startDate).slice(0, 10) });
      setActivePreset(null);
    }
    if (ev.matchKey) setTag(ev.matchKey);
  };

  const lastSync = sync?.entities.map(e => e.lastRunAt).filter(Boolean).sort().pop();
  useEffect(() => {
    onLastSync?.(lastSync ? new Date(lastSync).toLocaleString('en-GB') : null);
  }, [lastSync, onLastSync]);

  const onSync = async () => {
    setSync(s => (s ? { ...s, running: true } : s));
    try {
      await runSync();
      await load();
    } catch {
      setError('Sync failed — check DealPOS credentials on the server.');
    } finally {
      getSyncStatus().then(setSync).catch(() => {});
    }
  };

  const exportCsv = (report: ExportReport, extra: Record<string, string> = {}) =>
    downloadExport(report, filters, extra).catch(() => setError('Export failed.'));

  const syncErrors = sync?.entities.filter(e => e.status === 'error') ?? [];

  const chMax = Math.max(...channels.map(c => c.revenue), 1);
  const payTotal = Math.max(payments.reduce((s, p) => s + p.amount, 0), 1);

  return (
    <div className="space-y-3.5">
      {/* Filter bar — presets, range, scopes, and the DealPOS sync live together */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-[6px] border border-[var(--border)] overflow-hidden">
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => { setRange(presetRange(p.key)); setActivePreset(p.key); setEvent(''); }}
              className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${
                activePreset === p.key
                  ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <input type="date" value={range.from} max={range.to} onChange={e => { setRange(r => ({ ...r, from: e.target.value })); setActivePreset(null); setEvent(''); }} className={selectCls} />
        <span className="text-[11px] text-[var(--text-muted)]">to</span>
        <input type="date" value={range.to} min={range.from} onChange={e => { setRange(r => ({ ...r, to: e.target.value })); setActivePreset(null); setEvent(''); }} className={selectCls} />
        <select value={outlet} onChange={e => setOutlet(e.target.value)} className={selectCls}>
          <option value="">All outlets</option>
          {options.outlets.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={tag} onChange={e => { setTag(e.target.value); setEvent(''); }} className={selectCls}>
          <option value="">All channels</option>
          {options.tags.map(t => <option key={t} value={t}>{channelLabel(t)}</option>)}
        </select>
        {events.length > 0 && (
          <select value={event} onChange={e => pickEvent(e.target.value)} className={selectCls} title="Scope to an event's run window">
            <option value="">All events</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        )}
        {loading && <span className="text-[10px] text-[var(--text-faint)] animate-pulse">Loading…</span>}
        <div className="flex-1" />
        <button
          onClick={onSync}
          disabled={sync?.running}
          className="text-[12px] px-3 py-1.5 rounded-[6px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] disabled:opacity-50 transition-colors flex items-center gap-1.5"
        >
          <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 ${sync?.running ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><path d="M21 2v6h-6M3 22v-6h6" /><path d="M21 8a9 9 0 00-15-3.5L3 8M3 16a9 9 0 0015 3.5l3-3.5" /></svg>
          {sync?.running ? 'Syncing…' : 'Sync now'}
        </button>
      </div>

      {error && <div className="text-[11px] text-[var(--danger)] border border-[var(--danger)] rounded-[6px] px-3 py-2 bg-[var(--danger-t)]">{error}</div>}

      {/* KPI strip */}
      <KpiStrip summary={summary} />

      {/* Revenue over time */}
      <Panel
        title="Revenue over time"
        actions={
          <>
            <select value={granularity} onChange={e => setGranularity(e.target.value as Granularity)} className={selectCls}>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
            <ExportBtn onClick={() => exportCsv('timeseries', { granularity })} />
          </>
        }
      >
        <RevenueChart rows={series} />
      </Panel>

      {/* Channel + payments bento */}
      <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
        <Panel title="Revenue by channel" note={`${channels.length} channels`}>
          <div className="p-4 space-y-3.5">
            {channels.length === 0 && <p className="text-[11px] text-[var(--text-faint)]">No channel sales in range.</p>}
            {channels.map(c => (
              <div key={c.tag}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-primary)]">
                    <span className="w-2 h-2 rounded-full" style={{ background: channelColor(c.tag) }} />{channelLabel(c.tag)}
                    <span className="text-[10px] text-[var(--text-muted)]">· {c.orders} orders</span>
                  </span>
                  <span className="font-mono text-[12px] text-[var(--text-primary)]">{fmtRp(c.revenue)}</span>
                </div>
                <ShareBar value={c.revenue} max={chMax} color={channelColor(c.tag)} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Payments" note="reconciliation" actions={<ExportBtn onClick={() => exportCsv('payments')} />}>
          <div className="p-4 space-y-3 max-h-[320px] overflow-y-auto">
            {payments.length === 0 && <p className="text-[11px] text-[var(--text-faint)]">No payments in range.</p>}
            {payments.map(p => (
              <div key={p.method}>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <span className="text-[12px] text-[var(--text-primary)] truncate">{p.method}<span className="text-[10px] text-[var(--text-muted)]"> · {p.count} txns</span></span>
                  <span className="flex items-center gap-2.5 flex-shrink-0">
                    <span className="font-mono text-[12px] text-[var(--text-primary)]">{fmtRp(p.amount)}</span>
                    <span className="font-mono text-[10px] text-[var(--text-muted)] w-9 text-right">{fmtPct(p.share)}</span>
                  </span>
                </div>
                <ShareBar value={p.amount} max={payTotal} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Margins — covers top releases / categories / channels via groupBy */}
      <Panel
        title="Margins"
        note={margins.length ? `${margins.length} rows` : undefined}
        actions={
          <>
            <div className="flex rounded-[5px] border border-[var(--border)] overflow-hidden">
              {MARGIN_GROUPS.map(g => (
                <button
                  key={g.key}
                  onClick={() => setGroupBy(g.key)}
                  className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    groupBy === g.key ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <ExportBtn onClick={() => exportCsv('margins', { groupBy })} />
          </>
        }
      >
        <div className="max-h-[420px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-[var(--bg-surface)]">
              <tr>
                <th className={th}>{MARGIN_GROUPS.find(g => g.key === groupBy)?.head}</th>
                <th className={`${th} text-right`}>Units</th>
                <th className={`${th} text-right`}>Revenue</th>
                <th className={`${th} text-right`}>COGS</th>
                <th className={`${th} text-right`}>Margin</th>
                <th className={`${th} text-right`}>%</th>
              </tr>
            </thead>
            <tbody>
              {margins.length === 0 && (
                <tr><td colSpan={6} className={`${td} text-[var(--text-faint)] text-center py-8`}>No line data in range</td></tr>
              )}
              {margins.map(m => (
                <tr key={m.group} className="hover:bg-[var(--bg-overlay)] transition-colors">
                  <td className={`${td} max-w-[280px] truncate text-[var(--text-primary)]`} title={m.group}>{groupBy === 'tag' ? channelLabel(m.group) : m.group}</td>
                  <td className={tdNum}>{m.unitsSold.toLocaleString('en-GB')}</td>
                  <td className={`${tdNum} text-[var(--text-primary)]`}>{fmtRp(m.revenue)}</td>
                  <td className={`${tdNum} text-[var(--text-muted)]`}>{fmtRp(m.cogs)}</td>
                  <td className={tdNum}>{fmtRp(m.margin)}</td>
                  <td className={`${tdNum} ${m.marginPct != null && m.marginPct < 0 ? 'text-[var(--danger)]' : ''}`}>{fmtPct(m.marginPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Sync status */}
      {sync && (
        <div className="text-[10px] text-[var(--text-muted)] flex flex-wrap gap-x-4 gap-y-1 px-1">
          {sync.entities.map(e => (
            <span key={e.entity} className={e.status === 'error' ? 'text-[var(--danger)]' : undefined}>
              {e.entity}: {e.status}{e.lastRunAt ? ` · ${new Date(e.lastRunAt).toLocaleString('en-GB')}` : ''}
            </span>
          ))}
          {syncErrors.length > 0 && <span className="text-[var(--danger)]">Check server logs for failed entities.</span>}
        </div>
      )}
    </div>
  );
}

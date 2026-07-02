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

const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const fmtRp = (v: number) => idr.format(v);
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

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3.5 py-2.5">
      <p className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1">{label}</p>
      <p className="text-[20px] font-black font-mono text-[var(--text-primary)] leading-none">{value}</p>
      {sub && <p className="text-[9px] mt-1 text-[var(--text-faint)]">{sub}</p>}
    </div>
  );
}

function Panel({
  title, onExport, actions, children,
}: {
  title: string;
  onExport?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-[var(--border-sub)] flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">{title}</h3>
        <div className="flex items-center gap-1.5">
          {actions}
          {onExport && (
            <button
              onClick={onExport}
              className="text-[10px] px-2 py-0.5 rounded border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors"
            >
              Export CSV
            </button>
          )}
        </div>
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}

function RevenueChart({ rows }: { rows: TimeseriesRow[] }) {
  if (rows.length === 0) {
    return <div className="h-36 flex items-center justify-center text-[11px] text-[var(--text-faint)]">No data in range</div>;
  }
  const W = 720, H = 150, PAD = 4;
  const max = Math.max(...rows.map(r => r.revenue), 1);
  const bw = (W - PAD * 2) / rows.length;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-36" preserveAspectRatio="none" role="img" aria-label="Revenue over time">
        {rows.map((r, i) => {
          const h = Math.max(1, (r.revenue / max) * (H - 22));
          const mh = Math.max(0, (Math.max(r.margin, 0) / max) * (H - 22));
          return (
            <g key={r.period}>
              <rect x={PAD + i * bw + 1} y={H - h} width={Math.max(1, bw - 2)} height={h} fill="var(--text-muted)">
                <title>{`${r.period} · ${fmtRp(r.revenue)} · ${r.orders} orders`}</title>
              </rect>
              <rect x={PAD + i * bw + 1} y={H - mh} width={Math.max(1, bw - 2)} height={mh} fill="var(--text-primary)">
                <title>{`${r.period} margin ${fmtRp(r.margin)}`}</title>
              </rect>
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between mt-1 text-[9px] font-mono text-[var(--text-faint)]">
        <span>{rows[0].period}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 inline-block bg-[var(--text-muted)]" /> Revenue</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 inline-block bg-[var(--text-primary)]" /> Margin</span>
        </span>
        <span>{rows[rows.length - 1].period}</span>
      </div>
    </div>
  );
}

const th = 'text-left text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)] font-semibold pb-1.5';
const td = 'py-1.5 text-[11.5px] border-t border-[var(--border-sub)]';
const tdNum = `${td} font-mono text-right tabular-nums`;

export function Finance() {
  const [range, setRange] = useState(() => presetRange('mtd'));
  const [activePreset, setActivePreset] = useState<PresetKey | null>('mtd');
  const [outlet, setOutlet] = useState('');
  const [tag, setTag] = useState('');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [groupBy, setGroupBy] = useState<MarginGroup>('release');

  const [options, setOptions] = useState<{ outlets: string[]; tags: string[] }>({ outlets: [], tags: [] });
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [series, setSeries] = useState<TimeseriesRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [margins, setMargins] = useState<MarginRow[]>([]);
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
      setError('Could not load finance data. Run a DealPOS sync first, or check the API.');
    } finally {
      setLoading(false);
    }
  }, [filters, granularity, groupBy]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    getFilterOptions().then(setOptions).catch(() => {});
    getSyncStatus().then(setSync).catch(() => {});
  }, []);

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

  const lastSync = sync?.entities
    .map(e => e.lastRunAt).filter(Boolean).sort().pop();
  const syncErrors = sync?.entities.filter(e => e.status === 'error') ?? [];

  const selectCls = 'bg-[var(--bg-surface)] border border-[var(--border)] rounded px-2 py-1 text-[11px] text-[var(--text-primary)]';

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[18px] font-black tracking-tight text-[var(--text-primary)]">Finance</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Sales, margins and payments — synced from DealPOS{lastSync ? ` · last sync ${new Date(lastSync).toLocaleString('en-GB')}` : ''}
          </p>
        </div>
        <button
          onClick={onSync}
          disabled={sync?.running}
          className="text-[11px] px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] disabled:opacity-50 transition-colors"
        >
          {sync?.running ? 'Syncing…' : 'Sync now'}
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-[var(--border)] overflow-hidden">
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => { setRange(presetRange(p.key)); setActivePreset(p.key); }}
              className={`px-2.5 py-1 text-[11px] transition-colors ${
                activePreset === p.key
                  ? 'bg-[var(--text-primary)] text-[var(--bg-base)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          type="date" value={range.from} max={range.to}
          onChange={e => { setRange(r => ({ ...r, from: e.target.value })); setActivePreset(null); }}
          className={selectCls}
        />
        <span className="text-[11px] text-[var(--text-muted)]">to</span>
        <input
          type="date" value={range.to} min={range.from}
          onChange={e => { setRange(r => ({ ...r, to: e.target.value })); setActivePreset(null); }}
          className={selectCls}
        />
        <select value={outlet} onChange={e => setOutlet(e.target.value)} className={selectCls}>
          <option value="">All outlets</option>
          {options.outlets.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={tag} onChange={e => setTag(e.target.value)} className={selectCls}>
          <option value="">All channels</option>
          {options.tags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {loading && <span className="text-[10px] text-[var(--text-faint)]">Loading…</span>}
      </div>

      {error && (
        <div className="text-[11px] text-[var(--danger)] border border-[var(--danger)] rounded-md px-3 py-2">{error}</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-2.5">
        <Kpi label="Revenue" value={summary ? fmtRp(summary.revenue) : '—'} sub={summary ? `${summary.unitsSold} units` : undefined} />
        <Kpi label="Orders" value={summary ? String(summary.orders) : '—'} sub={summary ? `AOV ${fmtRp(summary.avgOrderValue)}` : undefined} />
        <Kpi label="COGS" value={summary ? fmtRp(summary.cogs) : '—'} />
        <Kpi label="Gross margin" value={summary ? fmtRp(summary.grossMargin) : '—'} sub={summary ? fmtPct(summary.grossMarginPct) : undefined} />
      </div>

      <Panel
        title="Revenue over time"
        onExport={() => exportCsv('timeseries', { granularity })}
        actions={
          <select value={granularity} onChange={e => setGranularity(e.target.value as Granularity)} className={selectCls}>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        }
      >
        <RevenueChart rows={series} />
      </Panel>

      <div className="grid grid-cols-2 gap-3">
        <Panel title="Payments reconciliation" onExport={() => exportCsv('payments')}>
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Method</th>
                <th className={`${th} text-right`}>Amount</th>
                <th className={`${th} text-right`}>Txns</th>
                <th className={`${th} text-right`}>Share</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr><td colSpan={4} className={`${td} text-[var(--text-faint)]`}>No payments in range</td></tr>
              )}
              {payments.map(p => (
                <tr key={p.method}>
                  <td className={td}>{p.method}</td>
                  <td className={tdNum}>{fmtRp(p.amount)}</td>
                  <td className={tdNum}>{p.count}</td>
                  <td className={tdNum}>{fmtPct(p.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel
          title="Margins"
          onExport={() => exportCsv('margins', { groupBy })}
          actions={
            <select value={groupBy} onChange={e => setGroupBy(e.target.value as MarginGroup)} className={selectCls}>
              <option value="release">By release</option>
              <option value="category">By category</option>
              <option value="tag">By channel</option>
            </select>
          }
        >
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>{groupBy === 'tag' ? 'Channel' : groupBy === 'category' ? 'Category' : 'Release'}</th>
                  <th className={`${th} text-right`}>Revenue</th>
                  <th className={`${th} text-right`}>COGS</th>
                  <th className={`${th} text-right`}>Margin</th>
                  <th className={`${th} text-right`}>%</th>
                </tr>
              </thead>
              <tbody>
                {margins.length === 0 && (
                  <tr><td colSpan={5} className={`${td} text-[var(--text-faint)]`}>No line data in range</td></tr>
                )}
                {margins.map(m => (
                  <tr key={m.group}>
                    <td className={`${td} truncate max-w-[180px]`} title={m.group}>{m.group}</td>
                    <td className={tdNum}>{fmtRp(m.revenue)}</td>
                    <td className={tdNum}>{fmtRp(m.cogs)}</td>
                    <td className={tdNum}>{fmtRp(m.margin)}</td>
                    <td className={tdNum}>{fmtPct(m.marginPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Sync status */}
      {sync && (
        <div className="text-[10px] text-[var(--text-muted)] flex flex-wrap gap-x-4 gap-y-1">
          {sync.entities.map(e => (
            <span key={e.entity} className={e.status === 'error' ? 'text-[var(--danger)]' : undefined}>
              {e.entity}: {e.status}{e.lastRunAt ? ` · ${new Date(e.lastRunAt).toLocaleString('en-GB')}` : ''}
            </span>
          ))}
          {syncErrors.length > 0 && (
            <span className="text-[var(--danger)]">Check server logs for failed entities.</span>
          )}
        </div>
      )}
    </div>
  );
}

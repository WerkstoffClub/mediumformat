import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fmtDate, fmtIdr } from '../../api/ops';
import { listVouchers, type Voucher } from '../../api/vouchers';
import { EmptyRow, PageHeader, Paginator, SearchBox, tdCls, thCls } from '../../components/ui/Page';
import { VoucherDrawer } from './VoucherDrawer';

type StatusFilter = 'all' | 'active' | 'scheduled' | 'expired' | 'disabled';

const STATUS_TABS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all',       label: 'All' },
  { key: 'active',    label: 'Active' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'expired',   label: 'Expired' },
  { key: 'disabled',  label: 'Disabled' },
];

const isStatus = (v: string | null): v is StatusFilter =>
  v === 'all' || v === 'active' || v === 'scheduled' || v === 'expired' || v === 'disabled';

/** Derive a per-row status label using the same rules as the API filter. */
function statusLabel(v: Voucher): 'Active' | 'Scheduled' | 'Expired' | 'Disabled' {
  if (!v.active) return 'Disabled';
  const now = Date.now();
  if (v.startsAt && new Date(v.startsAt).getTime() > now) return 'Scheduled';
  if (v.expiresAt && new Date(v.expiresAt).getTime() < now) return 'Expired';
  return 'Active';
}

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function Vouchers() {
  const [params, setParams] = useSearchParams();
  const statusParam = params.get('status');
  const status: StatusFilter = isStatus(statusParam) ? statusParam : 'all';
  const urlQ = params.get('q') ?? '';

  const [qInput, setQInput] = useState(urlQ);
  const debouncedQ = useDebounced(qInput, 300);
  const firstQRun = useRef(true);
  useEffect(() => {
    if (firstQRun.current) { firstQRun.current = false; return; }
    setParams(prev => {
      const next = new URLSearchParams(prev);
      if (debouncedQ) next.set('q', debouncedQ); else next.delete('q');
      return next;
    }, { replace: true });
  }, [debouncedQ, setParams]);

  const [rows, setRows] = useState<Voucher[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [selected, setSelected] = useState<string | 'new' | null>(null);

  // Unfiltered KPI slice (cap 200 rows — same approximation as the PO page).
  const [kpiRows, setKpiRows] = useState<Voucher[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    listVouchers({
      page,
      limit: 50,
      q: debouncedQ || undefined,
      status: status !== 'all' ? status : undefined,
    })
      .then(r => { setRows(r.items); setTotal(r.total); })
      .catch(() => { setRows([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [page, debouncedQ, status]);

  const loadKpi = useCallback(() => {
    listVouchers({ limit: 200 })
      .then(r => setKpiRows(r.items))
      .catch(() => setKpiRows([]));
  }, []);

  useEffect(load, [load]);
  useEffect(loadKpi, [loadKpi]);

  const showToast = useCallback((kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(t => (t?.text === text ? null : t)), 4000);
  }, []);

  const setStatus = (next: StatusFilter) => {
    setParams(prev => {
      const p = new URLSearchParams(prev);
      if (next === 'all') p.delete('status'); else p.set('status', next);
      return p;
    }, { replace: true });
    setPage(1);
  };

  const kpi = useMemo(() => {
    const now = Date.now();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const active = kpiRows.filter(v => statusLabel(v) === 'Active');
    const redeemedThisMonth = kpiRows.filter(v =>
      v.usageCount > 0 && new Date(v.updatedAt).getTime() >= monthStart.getTime(),
    ).reduce((s, v) => s + v.usageCount, 0);
    const expiringSoon = kpiRows.filter(v => {
      if (!v.expiresAt) return false;
      const t = new Date(v.expiresAt).getTime();
      return t > now && t <= now + 7 * 86_400_000;
    });
    return {
      active: active.length,
      redeemedThisMonth,
      totalDiscount: 0, // estimate — full history in v2
      expiringSoon: expiringSoon.length,
    };
  }, [kpiRows]);

  const closeDrawer = () => setSelected(null);
  const onSaved = () => { load(); loadKpi(); };

  return (
    <div>
      <PageHeader title="Vouchers" sub="Discount codes for the storefront and POS." />

      <div className="grid grid-cols-4 gap-3 mb-4 max-md:grid-cols-2">
        <KpiTile label="Active" value={String(kpi.active)} meta="Live and within window" />
        <KpiTile label="Redeemed this month" value={String(kpi.redeemedThisMonth)} meta="Usage since day 1" />
        <KpiTile
          label="Total discount given"
          value={fmtIdr(kpi.totalDiscount)}
          meta="Estimate — full history in v2"
          title="Estimate — full history in v2"
        />
        <KpiTile label="Expiring in 7 days" value={String(kpi.expiringSoon)} meta="Heads up" />
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div
          className="flex gap-[2px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-[3px] flex-wrap"
          role="tablist"
        >
          {STATUS_TABS.map(t => {
            const on = t.key === status;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={on}
                onClick={() => setStatus(t.key)}
                className={`text-[12px] font-medium px-3 py-1.5 rounded-[6px] transition-colors ${
                  on
                    ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex-1" />
        <SearchBox
          value={qInput}
          onChange={v => { setQInput(v); setPage(1); }}
          placeholder="Search code…"
        />
        <button
          onClick={() => setSelected('new')}
          className="text-[12px] px-3 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] font-semibold hover:opacity-90 transition-opacity"
        >
          + New voucher
        </button>
      </div>

      {toast && (
        <div
          role="status"
          className={`mb-3 text-[12px] px-3 py-2 rounded-[6px] border ${
            toast.kind === 'ok'
              ? 'border-[var(--success)] bg-[var(--success-t)] text-[var(--success)]'
              : 'border-[var(--danger)] bg-[var(--danger-t)] text-[var(--danger)]'
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-x-auto">
        <table className="w-full border-collapse min-w-[880px]">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              {['Code', 'Kind', 'Value', 'Min. order', 'Usage', 'Starts', 'Expires', 'Status'].map(h => (
                <th key={h} className={thCls}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <EmptyRow cols={8}>Loading…</EmptyRow>}
            {!loading && rows.length === 0 && (
              <EmptyRow cols={8}>
                {debouncedQ ? 'No vouchers match your search.' : 'No vouchers yet — create one to start offering discounts.'}
              </EmptyRow>
            )}
            {rows.map(v => (
              <tr
                key={v.id}
                onClick={() => setSelected(v.id)}
                className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                <td className={`${tdCls} font-mono font-medium text-[var(--text-primary)] uppercase whitespace-nowrap`}>{v.code}</td>
                <td className={tdCls}><KindBadge kind={v.kind} /></td>
                <td className={`${tdCls} font-mono text-right whitespace-nowrap`}>
                  {v.kind === 'PERCENT' ? `${v.value}%` : fmtIdr(v.value)}
                </td>
                <td className={`${tdCls} font-mono text-right whitespace-nowrap text-[var(--text-muted)]`}>
                  {v.minOrderIdr > 0 ? fmtIdr(v.minOrderIdr) : <span className="text-[var(--text-faint)]">—</span>}
                </td>
                <td className={`${tdCls} font-mono text-right whitespace-nowrap`}>
                  {v.usageCount} / {v.usageLimit ?? '∞'}
                </td>
                <td className={`${tdCls} text-[var(--text-muted)] whitespace-nowrap`}>{v.startsAt ? fmtDate(v.startsAt) : '—'}</td>
                <td className={`${tdCls} text-[var(--text-muted)] whitespace-nowrap`}>{v.expiresAt ? fmtDate(v.expiresAt) : '—'}</td>
                <td className={tdCls}><VoucherStatusPill value={statusLabel(v)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginator page={page} limit={50} total={total} shown={rows.length} onPage={setPage} />
      </div>

      {selected && (
        <VoucherDrawer
          key={selected}
          voucherId={selected === 'new' ? null : selected}
          onClose={closeDrawer}
          onSaved={onSaved}
          onToast={showToast}
        />
      )}
    </div>
  );
}

function KindBadge({ kind }: { kind: 'PERCENT' | 'FIXED_IDR' }) {
  const label = kind === 'PERCENT' ? '%' : 'Rp';
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] font-mono text-[var(--text-primary)] whitespace-nowrap">
      {label}
    </span>
  );
}

const STATUS_COLOR: Record<'Active' | 'Scheduled' | 'Expired' | 'Disabled', string> = {
  Active:    'var(--success)',
  Scheduled: 'var(--warning)',
  Expired:   'var(--text-muted)',
  Disabled:  'var(--danger)',
};

function VoucherStatusPill({ value }: { value: 'Active' | 'Scheduled' | 'Expired' | 'Disabled' }) {
  const color = STATUS_COLOR[value];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] whitespace-nowrap"
      style={{ color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {value}
    </span>
  );
}

function KpiTile({ label, value, meta, title }: { label: string; value: string; meta: string; title?: string }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] px-4 py-3">
      <span className="block text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--text-muted)]">{label}</span>
      <span
        className="block font-mono text-[22px] font-medium tracking-[-0.02em] text-[var(--text-primary)] mt-1.5 [font-variant-numeric:tabular-nums]"
        title={title}
      >
        {value}
      </span>
      <span className="block text-[11px] text-[var(--text-faint)] mt-1">{meta}</span>
    </div>
  );
}

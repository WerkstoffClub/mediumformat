import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fmtDate, fmtIdr, fmtIdrCompact } from '../../api/ops';
import {
  listPos, syncPosFromDealpos,
  type PoStatus, type PurchaseOrder,
} from '../../api/purchaseOrders';
import { EmptyRow, Paginator, SearchBox, StatusPill, tdCls, thCls } from '../../components/ui/Page';
import { PurchaseOrderDrawer } from './PurchaseOrderDrawer';

const TABS: Array<{ key: 'all' | PoStatus; label: string }> = [
  { key: 'all',       label: 'All' },
  { key: 'DRAFT',     label: 'Draft' },
  { key: 'SENT',      label: 'Sent' },
  { key: 'PARTIAL',   label: 'Partial' },
  { key: 'RECEIVED',  label: 'Received' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_LABEL: Record<PoStatus, string> = {
  DRAFT: 'Draft', SENT: 'Sent', PARTIAL: 'Partial', RECEIVED: 'Received', CANCELLED: 'Cancelled',
};

const isPoStatus = (v: string | null): v is PoStatus =>
  v === 'DRAFT' || v === 'SENT' || v === 'PARTIAL' || v === 'RECEIVED' || v === 'CANCELLED';

/** Local debounce hook — keeps typing snappy while URL/API stays quiet. */
function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function PurchaseOrdersList() {
  const [params, setParams] = useSearchParams();
  const statusParam = params.get('status');
  const status: 'all' | PoStatus = isPoStatus(statusParam) ? statusParam : 'all';
  const urlQ = params.get('q') ?? '';

  // Search input is local; debounced value drives URL + API.
  const [qInput, setQInput] = useState(urlQ);
  const debouncedQ = useDebounced(qInput, 300);
  const firstQRun = useRef(true);
  useEffect(() => {
    // Skip the first run so we don't clobber a landing URL param.
    if (firstQRun.current) { firstQRun.current = false; return; }
    setParams(prev => {
      const next = new URLSearchParams(prev);
      if (debouncedQ) next.set('q', debouncedQ); else next.delete('q');
      return next;
    }, { replace: true });
  }, [debouncedQ, setParams]);

  const [rows, setRows] = useState<PurchaseOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [selected, setSelected] = useState<string | 'new' | null>(null);

  // Second, unfiltered read for KPI aggregates. Cheap approximation: cap 200.
  const [kpiRows, setKpiRows] = useState<PurchaseOrder[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    listPos({
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
    listPos({ limit: 200 }).then(r => setKpiRows(r.items)).catch(() => setKpiRows([]));
  }, []);

  useEffect(load, [load]);
  useEffect(loadKpi, [loadKpi]);

  const showToast = useCallback((kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(t => (t?.text === text ? null : t)), 4000);
  }, []);

  const onSync = async () => {
    setSyncing(true);
    try {
      const r = await syncPosFromDealpos();
      showToast('ok', `Created ${r.created} PO${r.created === 1 ? '' : 's'} from DealPOS bills`);
      load();
      loadKpi();
    } catch {
      showToast('err', 'Sync failed. Try again.');
    } finally {
      setSyncing(false);
    }
  };

  const setStatus = (next: 'all' | PoStatus) => {
    setParams(prev => {
      const p = new URLSearchParams(prev);
      if (next === 'all') p.delete('status'); else p.set('status', next);
      return p;
    }, { replace: true });
    setPage(1);
  };

  const kpi = useMemo(() => {
    const open = kpiRows.filter(p => p.status === 'SENT' || p.status === 'PARTIAL');
    const partial = kpiRows.filter(p => p.status === 'PARTIAL');
    const now = new Date();
    const key = `${now.getFullYear()}-${now.getMonth()}`;
    const receivedThisMonth = kpiRows.filter(p => {
      if (p.status !== 'RECEIVED' || !p.receivedAt) return false;
      const d = new Date(p.receivedAt);
      return `${d.getFullYear()}-${d.getMonth()}` === key;
    });
    const valueOnOrder = open.reduce((s, p) => s + Number(p.totalIdr || 0), 0);
    return {
      openCount: open.length,
      partial: partial.length,
      receivedMonth: receivedThisMonth.length,
      valueOnOrder,
    };
  }, [kpiRows]);

  const closeDrawer = () => setSelected(null);
  const onSaved = () => { load(); loadKpi(); };

  return (
    <div>
      {/* KPI strip — mockup pattern, shared with Orders */}
      <div className="grid grid-cols-4 gap-3 mb-4 max-md:grid-cols-2">
        <KpiTile label="Open POs" value={String(kpi.openCount)} meta="SENT + PARTIAL" />
        <KpiTile label="Partially received" value={String(kpi.partial)} meta="Awaiting the rest" />
        <KpiTile label="Received this month" value={String(kpi.receivedMonth)} meta="Fully in stock" />
        <KpiTile
          label="Value on order"
          value={fmtIdrCompact(kpi.valueOnOrder)}
          meta="Sum of open POs"
          title={fmtIdr(kpi.valueOnOrder)}
        />
      </div>

      {/* Toolbar: status pills + search + actions */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex gap-[2px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-[3px] flex-wrap" role="tablist">
          {TABS.map(t => {
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
        <SearchBox value={qInput} onChange={v => { setQInput(v); setPage(1); }} placeholder="Search PO # or supplier…" />
        <button
          onClick={onSync}
          disabled={syncing}
          className="text-[12px] px-3 py-2 rounded-[6px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] disabled:opacity-50 flex items-center gap-1.5 transition-colors"
        >
          <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
            <path d="M21 2v6h-6M3 22v-6h6" />
            <path d="M21 8a9 9 0 00-15-3.5L3 8M3 16a9 9 0 0015 3.5l3-3.5" />
          </svg>
          {syncing ? 'Syncing…' : 'Sync from DealPOS'}
        </button>
        <button
          onClick={() => setSelected('new')}
          className="text-[12px] px-3 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] font-semibold hover:opacity-90 transition-opacity"
        >
          + New PO
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
        <table className="w-full border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              {['PO #', 'Supplier', 'Ordered', 'ETA', 'Items', 'Value', 'Status', ''].map(h => (
                <th key={h} className={thCls}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <EmptyRow cols={8}>Loading…</EmptyRow>}
            {!loading && rows.length === 0 && (
              <EmptyRow cols={8}>
                {debouncedQ
                  ? 'No purchase orders match your search.'
                  : 'No purchase orders yet — create one, or sync bills from DealPOS.'}
              </EmptyRow>
            )}
            {rows.map(p => (
              <tr
                key={p.id}
                onClick={() => setSelected(p.id)}
                className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                <td className={`${tdCls} font-mono font-medium text-[var(--text-primary)] whitespace-nowrap`}>{p.poNumber}</td>
                <td className={`${tdCls} max-w-[220px] truncate`}>{p.supplierName || <span className="text-[var(--text-faint)]">—</span>}</td>
                <td className={`${tdCls} text-[var(--text-muted)] whitespace-nowrap`}>{fmtDate(p.orderedAt)}</td>
                <td className={`${tdCls} whitespace-nowrap`}><EtaCell po={p} /></td>
                <td className={`${tdCls} font-mono text-right`}>{p.lines?.length ?? 0}</td>
                <td className={`${tdCls} font-mono text-right whitespace-nowrap text-[var(--text-primary)]`}>{fmtIdr(p.totalIdr)}</td>
                <td className={tdCls}><StatusPill value={STATUS_LABEL[p.status]} /></td>
                <td className={`${tdCls} text-[var(--text-faint)]`}>
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginator page={page} limit={50} total={total} shown={rows.length} onPage={setPage} />
      </div>

      {selected && (
        <PurchaseOrderDrawer
          key={selected}
          poId={selected === 'new' ? null : selected}
          onClose={closeDrawer}
          onSaved={onSaved}
          onToast={showToast}
        />
      )}
    </div>
  );
}

/** ETA cell — flags rows whose ETA is in the past on live POs. */
function EtaCell({ po }: { po: PurchaseOrder }) {
  if (!po.etaAt) return <span className="text-[var(--text-faint)]">—</span>;
  const eta = new Date(po.etaAt);
  const overdue = !Number.isNaN(eta.getTime())
    && eta.getTime() < Date.now()
    && po.status !== 'RECEIVED'
    && po.status !== 'CANCELLED';
  return <span className={overdue ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}>{fmtDate(po.etaAt)}</span>;
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

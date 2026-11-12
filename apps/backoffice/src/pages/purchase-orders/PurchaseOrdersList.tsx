import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fmtIdr, fmtIdrCompact } from '../../api/ops';
import {
  getPoSummary, listPos, syncPosFromDealpos,
  type PoStatus, type PoSummary, type PurchaseOrder,
} from '../../api/purchaseOrders';
import { EmptyRow, PageHeader, Paginator, SearchBox, Stat, Widget } from '../../components/ui/Page';
import { PurchaseOrderDrawer } from './PurchaseOrderDrawer';

const PAGE_SIZE = 50;

const STATUS_LABEL: Record<PoStatus, string> = {
  DRAFT: 'Draft', SENT: 'Ordered', PARTIAL: 'Partially received', RECEIVED: 'Received', CANCELLED: 'Cancelled',
};

/** Mockup pill tints (.st-*): draft/ordered info, partial warning, received success, cancelled danger. */
const STATUS_TONE: Record<PoStatus, string> = {
  DRAFT: 'info', SENT: 'info', PARTIAL: 'warning', RECEIVED: 'success', CANCELLED: 'danger',
};

const CHIPS: Array<{ key: 'all' | PoStatus; label: string }> = [
  { key: 'all', label: 'All' },
  ...(Object.keys(STATUS_LABEL) as PoStatus[]).map(k => ({ key: k, label: STATUS_LABEL[k] })),
];

const isPoStatus = (v: string | null): v is PoStatus => v != null && v in STATUS_LABEL;

const fmtShort = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';

const units = (p: PurchaseOrder) => p.lines.reduce((s, l) => s + l.qtyOrdered, 0);

/** Local debounce hook — keeps typing snappy while URL/API stays quiet. */
function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Client-side CSV of the rows currently on screen. */
function exportCsv(rows: PurchaseOrder[]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['PO no.', 'Supplier', 'Status', 'Units', 'Total IDR', 'Ordered', 'Expected'];
  const body = rows.map(p => [p.poNumber, p.supplierName, STATUS_LABEL[p.status], units(p), p.totalIdr, p.orderedAt ?? '', p.etaAt ?? '']);
  const csv = [head, ...body].map(r => r.map(esc).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const btnSec = 'flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] border border-[var(--border)] text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 transition-colors';
const th = 'px-4 pt-[11px] pb-[9px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)] text-left whitespace-nowrap';
const td = 'px-4 py-[13px] text-[13px] text-[var(--text-secondary)] align-middle';

export function PurchaseOrdersList({ tabs }: { tabs?: React.ReactNode }) {
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [summary, setSummary] = useState<PoSummary | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listPos({
      page,
      limit: PAGE_SIZE,
      q: debouncedQ || undefined,
      status: status !== 'all' ? status : undefined,
    })
      .then(r => { setRows(r.items); setTotal(r.total); })
      .catch(() => { setRows([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [page, debouncedQ, status]);

  const loadSummary = useCallback(() => {
    getPoSummary().then(setSummary).catch(() => setSummary(null));
  }, []);

  useEffect(load, [load]);
  useEffect(loadSummary, [loadSummary]);

  const showToast = useCallback((kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(t => (t?.text === text ? null : t)), 4000);
  }, []);

  const refresh = () => { load(); loadSummary(); };

  const onSync = async () => {
    setSyncing(true);
    try {
      const r = await syncPosFromDealpos();
      showToast('ok', `Created ${r.created} PO${r.created === 1 ? '' : 's'} from DealPOS bills`);
      refresh();
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

  const s = summary;
  const dash = '—';

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        sub="Restock from suppliers & distributors — inbound stock & costs"
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button onClick={onSync} disabled={syncing} className={btnSec}>
              <svg viewBox="0 0 24 24" className={`w-[15px] h-[15px] ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
                <path d="M21 2v6h-6M3 22v-6h6" /><path d="M21 8a9 9 0 00-15-3.5L3 8M3 16a9 9 0 0015 3.5l3-3.5" />
              </svg>
              {syncing ? 'Syncing…' : 'Sync DealPOS'}
            </button>
            <button onClick={() => exportCsv(rows)} disabled={rows.length === 0} className={btnSec}>
              <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Export
            </button>
            <button onClick={() => setSelected('new')} className="flex items-center gap-1.5 px-4 py-2.5 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] text-[14px] font-medium hover:opacity-90 transition-opacity">
              <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Create PO
            </button>
          </div>
        }
      />
      {tabs}

      <div className="grid grid-cols-4 gap-3 mb-3.5 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <Stat label="Open POs" value={s ? String(s.openCount) : dash}>
          <span className="text-[var(--text-muted)]"><span className="font-mono font-medium">{s?.partialCount ?? dash}</span> partially received</span>
        </Stat>
        <Stat label="On order · cost" value={s ? fmtIdrCompact(s.onOrderIdr) : dash}>
          <span className="text-[var(--text-muted)]">across all suppliers</span>
        </Stat>
        <Stat label="Units inbound" value={s ? s.unitsOrdered.toLocaleString('id-ID') : dash}>
          <span className="text-[var(--text-muted)]"><span className="font-mono font-medium">{s?.unitsReceived.toLocaleString('id-ID') ?? dash}</span> received so far</span>
        </Stat>
        <Stat label="Due this week" value={s ? String(s.dueThisWeek) : dash}>
          <span className="text-[var(--text-muted)]">
            {s ? `POs expected by ${fmtShort(s.weekEnd)}` : dash}
            {s && s.overdueCount > 0 && <span className="text-[var(--danger)]"> · {s.overdueCount} overdue</span>}
          </span>
        </Stat>
      </div>

      <div className="flex items-center gap-2 mb-3.5 flex-wrap">
        {CHIPS.map(c => {
          const on = c.key === status;
          return (
            <button
              key={c.key}
              aria-pressed={on}
              onClick={() => setStatus(c.key)}
              className={`text-[13px] font-medium px-[13px] py-[5px] rounded-full border transition-colors ${
                on ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {c.label}
            </button>
          );
        })}
        <div className="flex-1" />
        <SearchBox value={qInput} onChange={v => { setQInput(v); setPage(1); }} placeholder="Search PO # or supplier…" />
      </div>

      {toast && (
        <div
          role="status"
          className={`mb-3 text-[13px] px-3 py-2 rounded-[6px] border ${
            toast.kind === 'ok'
              ? 'border-[var(--success)] bg-[var(--success-t)] text-[var(--success)]'
              : 'border-[var(--danger)] bg-[var(--danger-t)] text-[var(--danger)]'
          }`}
        >
          {toast.text}
        </div>
      )}

      <Widget title="Purchase orders" note={`${rows.length} shown · row expands for receiving`}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[640px]">
            <thead>
              <tr>
                <th className={th}>PO no.</th>
                <th className={th}>Supplier</th>
                <th className={`${th} text-right max-md:hidden`}>Items</th>
                <th className={`${th} text-right`}>Total cost</th>
                <th className={`${th} max-md:hidden`}>Expected</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && <EmptyRow cols={6}>Loading…</EmptyRow>}
              {!loading && rows.length === 0 && (
                <EmptyRow cols={6}>
                  {debouncedQ
                    ? 'No purchase orders match your search.'
                    : 'No purchase orders yet — create one, or sync bills from DealPOS.'}
                </EmptyRow>
              )}
              {!loading && rows.map(p => (
                <PoRow
                  key={p.id}
                  po={p}
                  open={expanded === p.id}
                  onToggle={() => setExpanded(e => (e === p.id ? null : p.id))}
                  onOpen={() => setSelected(p.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
        <Paginator page={page} limit={PAGE_SIZE} total={total} shown={rows.length} onPage={setPage} />
      </Widget>

      {selected && (
        <PurchaseOrderDrawer
          key={selected}
          poId={selected === 'new' ? null : selected}
          onClose={() => setSelected(null)}
          onSaved={refresh}
          onToast={showToast}
        />
      )}
    </div>
  );
}

function PoStatusPill({ status }: { status: PoStatus }) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className="inline-flex items-center gap-[5px] text-[11px] font-medium px-[9px] py-0.5 rounded-full whitespace-nowrap tracking-[0.01em]"
      style={{ background: `var(--${tone}-t)`, color: `var(--${tone})` }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** ETA flagged red when past on a live PO. */
function isOverdue(po: PurchaseOrder) {
  if (!po.etaAt || po.status === 'RECEIVED' || po.status === 'CANCELLED') return false;
  const t = new Date(po.etaAt).getTime();
  return !Number.isNaN(t) && t < Date.now();
}

function PoRow({ po, open, onToggle, onOpen }: { po: PurchaseOrder; open: boolean; onToggle: () => void; onOpen: () => void }) {
  const source = po.sourceBillId ? 'DealPOS bill' : 'Manual';
  return (
    <Fragment>
      <tr onClick={onToggle} aria-expanded={open} className="cursor-pointer border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors">
        <td className={td}>
          <div className="flex items-center gap-[9px]">
            <svg viewBox="0 0 24 24" className={`w-[15px] h-[15px] text-[var(--text-muted)] flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            <span className="font-mono text-[12px] font-medium text-[var(--text-primary)] whitespace-nowrap">{po.poNumber}</span>
          </div>
        </td>
        <td className={`${td} max-w-[260px]`}>
          <div className="font-medium text-[var(--text-primary)] truncate">{po.supplierName || '—'}</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{source}{po.orderedAt ? ` · ordered ${fmtShort(po.orderedAt)}` : ''}</div>
        </td>
        <td className={`${td} text-right font-mono font-medium text-[var(--text-primary)] max-md:hidden`}>{units(po).toLocaleString('id-ID')}</td>
        <td className={`${td} text-right font-mono font-medium text-[var(--text-primary)] whitespace-nowrap`}>{fmtIdr(po.totalIdr)}</td>
        <td className={`${td} font-mono text-[12px] whitespace-nowrap max-md:hidden ${isOverdue(po) ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>{fmtShort(po.etaAt)}</td>
        <td className={td}><PoStatusPill status={po.status} /></td>
      </tr>
      {open && (
        <tr className="border-t border-[var(--border)]">
          <td colSpan={6} className="p-0"><PoDetail po={po} onOpen={onOpen} /></td>
        </tr>
      )}
    </Fragment>
  );
}

function PoDetail({ po, onOpen }: { po: PurchaseOrder; onOpen: () => void }) {
  const ordered = units(po);
  const received = po.lines.reduce((s, l) => s + l.qtyReceived, 0);
  const pct = ordered > 0 ? Math.min(100, Math.round((received / ordered) * 100)) : 0;
  const canReceive = po.status !== 'CANCELLED' && po.status !== 'RECEIVED';
  const mini = 'text-[12px] font-medium px-3 py-[7px] rounded-[6px] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors';
  const lth = 'px-3 py-[9px] text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)] text-left bg-[var(--bg-surface)]';
  const ltd = 'px-3 py-[9px] text-[12px] text-[var(--text-secondary)] border-t border-[var(--border)]';
  return (
    <div className="p-4 bg-[var(--bg-base)]">
      <div className="flex items-center justify-between gap-3 mb-3.5 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="flex justify-between text-[11px] text-[var(--text-muted)] mb-1.5">
            <span>Receiving progress</span>
            <span className="font-mono text-[var(--text-primary)]">{received} / {ordered} units</span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex gap-2">
          {canReceive && <button onClick={onOpen} className={mini}>Receive stock</button>}
          <button onClick={onOpen} className={mini}>Open PO</button>
        </div>
      </div>
      <div className="border border-[var(--border)] rounded-[6px] overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={lth}>Item</th>
              <th className={`${lth} text-right`}>Qty</th>
              <th className={`${lth} text-right`}>Unit cost</th>
              <th className={`${lth} text-right`}>Line total</th>
              <th className={`${lth} text-right`}>Received</th>
            </tr>
          </thead>
          <tbody>
            {po.lines.length === 0 && (
              <tr><td colSpan={5} className={`${ltd} text-center text-[var(--text-faint)]`}>No lines on this PO.</td></tr>
            )}
            {po.lines.map((l, i) => (
              <tr key={l.id ?? i}>
                <td className={`${ltd} text-[var(--text-primary)]`}>{l.description}</td>
                <td className={`${ltd} text-right font-mono`}>{l.qtyOrdered}</td>
                <td className={`${ltd} text-right font-mono whitespace-nowrap`}>{fmtIdr(l.unitCostIdr)}</td>
                <td className={`${ltd} text-right font-mono whitespace-nowrap`}>{fmtIdr(l.totalIdr)}</td>
                <td className={`${ltd} text-right`}>
                  <span className={`font-mono text-[10px] px-[7px] py-px rounded-[4px] border ${
                    l.qtyReceived >= l.qtyOrdered && l.qtyOrdered > 0
                      ? 'border-[var(--success)] text-[var(--success)]'
                      : 'border-[var(--border)] text-[var(--text-secondary)]'
                  }`}>{l.qtyReceived} / {l.qtyOrdered}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {po.notes && <p className="mt-3 text-[12px] text-[var(--text-secondary)] leading-normal"><strong className="text-[var(--text-primary)]">Notes:</strong> {po.notes}</p>}
    </div>
  );
}

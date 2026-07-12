import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getImports, IMPORT_STATUSES, type ImportOrderRow, type ImportStatus } from '../../api/imports';
import { fmtDate } from '../../api/ops';
import { EmptyRow, PageHeader, Paginator, SearchBox, StatusPill, tdCls, thCls } from '../../components/ui/Page';
import { fmtNative, IMPORT_STATUS_LABEL, ORIGIN_LABEL } from './shared';

const TABS: Array<{ key: 'all' | ImportStatus; label: string }> = [
  { key: 'all', label: 'All' },
  ...IMPORT_STATUSES
    .filter(s => s !== 'DRAFT')
    .map(s => ({ key: s, label: IMPORT_STATUS_LABEL[s] })),
];

const isImportStatus = (v: string | null): v is ImportStatus =>
  !!v && (IMPORT_STATUSES as string[]).includes(v);

/** Local debounce hook — keeps typing snappy while URL/API stays quiet. */
function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function ImportsList() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const statusParam = params.get('status');
  const status: 'all' | ImportStatus = isImportStatus(statusParam) ? statusParam : 'all';
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

  const [rows, setRows] = useState<ImportOrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getImports({
      page,
      limit: 50,
      q: debouncedQ || undefined,
      status: status !== 'all' ? status : undefined,
    })
      .then(r => { setRows(r.items); setTotal(r.total); })
      .catch(() => { setRows([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [page, debouncedQ, status]);

  useEffect(load, [load]);

  const setStatus = (next: 'all' | ImportStatus) => {
    setParams(prev => {
      const p = new URLSearchParams(prev);
      if (next === 'all') p.delete('status'); else p.set('status', next);
      return p;
    }, { replace: true });
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="Imports"
        sub="Vendor invoices — from parsed PDF to landed inventory."
        actions={(
          <button
            onClick={() => navigate('/imports/new')}
            className="text-[12px] px-3 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] font-semibold hover:opacity-90 transition-opacity"
          >
            + New Import
          </button>
        )}
      />

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
                  on ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex-1" />
        <SearchBox value={qInput} onChange={v => { setQInput(v); setPage(1); }} placeholder="Search import # or vendor…" />
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-x-auto">
        <table className="w-full border-collapse min-w-[820px]">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              {['Import #', 'Vendor', 'Origin', 'Currency', 'Ordered', 'Lines', 'Subtotal', 'Status'].map(h => (
                <th key={h} className={thCls}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <EmptyRow cols={8}>Loading…</EmptyRow>}
            {!loading && rows.length === 0 && (
              <EmptyRow cols={8}>
                {debouncedQ ? 'No imports match your search.' : 'No imports yet — parse a vendor invoice to get started.'}
              </EmptyRow>
            )}
            {rows.map(row => (
              <tr
                key={row.id}
                onClick={() => navigate(`/imports/${row.id}`)}
                className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                <td className={`${tdCls} font-mono font-medium text-[var(--text-primary)] whitespace-nowrap`}>{row.number}</td>
                <td className={`${tdCls} max-w-[220px] truncate`}>{row.vendorName || <span className="text-[var(--text-faint)]">—</span>}</td>
                <td className={`${tdCls} text-[var(--text-muted)] whitespace-nowrap`}>{ORIGIN_LABEL[row.origin]}</td>
                <td className={`${tdCls} font-mono text-[var(--text-muted)]`}>{row.currency}</td>
                <td className={`${tdCls} text-[var(--text-muted)] whitespace-nowrap`}>{fmtDate(row.orderDate)}</td>
                <td className={`${tdCls} font-mono text-right`}>{row._count?.lines ?? 0}</td>
                <td className={`${tdCls} font-mono text-right whitespace-nowrap text-[var(--text-primary)]`}>{fmtNative(row.subtotalNative, row.currency)}</td>
                <td className={tdCls}><StatusPill value={IMPORT_STATUS_LABEL[row.status]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginator page={page} limit={50} total={total} shown={rows.length} onPage={setPage} />
      </div>
    </div>
  );
}

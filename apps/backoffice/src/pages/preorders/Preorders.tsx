import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fmtDate, fmtIdr, fmtIdrCompact } from '../../api/ops';
import { listPreorders, unsetPreorder, type PreorderRelease } from '../../api/preorders';
import { ReleaseCover } from '../../components/ui/Cover';
import { EmptyRow, PageHeader, SearchBox, tdCls, thCls } from '../../components/ui/Page';
import { AddPreorderDrawer } from './AddPreorderDrawer';

type Scope = 'all' | 'upcoming' | 'overdue';

const SCOPE_TABS: Array<{ key: Scope; label: string }> = [
  { key: 'all',      label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'overdue',  label: 'Overdue' },
];

const isScope = (v: string | null): v is Scope =>
  v === 'all' || v === 'upcoming' || v === 'overdue';

/** Local debounce hook — mirrors the PO list pattern. */
function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Selection sentinel — 'new' opens a fresh add-preorder drawer,
 *  any other string opens the drawer in edit mode against that release. */
type Selection = { mode: 'new' } | { mode: 'edit'; release: PreorderRelease } | null;

export function Preorders() {
  const [params, setParams] = useSearchParams();
  const scopeParam = params.get('scope');
  const scope: Scope = isScope(scopeParam) ? scopeParam : 'all';
  const urlQ = params.get('q') ?? '';
  const navigate = useNavigate();

  const [qInput, setQInput] = useState(urlQ);
  const debouncedQ = useDebounced(qInput, 300);
  useEffect(() => {
    setParams(prev => {
      const next = new URLSearchParams(prev);
      if (debouncedQ) next.set('q', debouncedQ); else next.delete('q');
      return next;
    }, { replace: true });
  }, [debouncedQ, setParams]);

  const [rows, setRows] = useState<PreorderRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [selected, setSelected] = useState<Selection>(null);

  const load = useCallback(() => {
    setLoading(true);
    listPreorders({ q: debouncedQ || undefined, scope })
      .then(r => setRows(r))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [debouncedQ, scope]);

  useEffect(load, [load]);

  const showToast = useCallback((kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(t => (t?.text === text ? null : t)), 4000);
  }, []);

  const setScope = (next: Scope) => {
    setParams(prev => {
      const p = new URLSearchParams(prev);
      if (next === 'all') p.delete('scope'); else p.set('scope', next);
      return p;
    }, { replace: true });
  };

  // KPI aggregates — computed off the currently loaded set. Same query-shape
  // as the PO list. "Active" is anything with preorder=true; upcoming/overdue
  // are derived from ETA vs. now.
  const kpi = useMemo(() => {
    const now = Date.now();
    const year = new Date().getFullYear();
    const month = new Date().getMonth();
    const activeCount = rows.length;
    const thisMonth = rows.filter(r => {
      if (!r.preorderEta) return false;
      const d = new Date(r.preorderEta);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    const totalUnits = rows.reduce((s, r) => s + Number(r.stock ?? 0), 0);
    const revenue = rows.reduce(
      (s, r) => s + Number(r.priceIdr ?? 0) * Number(r.stock ?? 0),
      0,
    );
    void now;
    return {
      activeCount,
      thisMonth: thisMonth.length,
      totalUnits,
      revenue,
    };
  }, [rows]);

  const onRemove = async (r: PreorderRelease) => {
    if (!confirm(`Remove preorder flag from "${r.artist} — ${r.title}"?`)) return;
    try {
      await unsetPreorder(r.id);
      showToast('ok', 'Preorder removed.');
      load();
    } catch {
      showToast('err', 'Could not remove preorder.');
    }
  };

  return (
    <div>
      <PageHeader
        title="Preorders"
        sub="Upcoming releases customers can commit to before arrival."
      />

      <div className="grid grid-cols-4 gap-3 mb-4 max-md:grid-cols-2">
        <KpiTile label="Active preorders" value={String(kpi.activeCount)} meta="preorder=true" />
        <KpiTile label="Expected this month" value={String(kpi.thisMonth)} meta="ETA in current month" />
        <KpiTile label="Total preorder units" value={String(kpi.totalUnits)} meta="Sum of committed stock" />
        <KpiTile
          label="Revenue committed"
          value={fmtIdrCompact(kpi.revenue)}
          meta="Sum of price × stock"
          title={fmtIdr(kpi.revenue)}
        />
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div
          className="flex gap-[2px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-[3px] flex-wrap"
          role="tablist"
        >
          {SCOPE_TABS.map(t => {
            const on = t.key === scope;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={on}
                onClick={() => setScope(t.key)}
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
          onChange={setQInput}
          placeholder="Search artist, title…"
        />
        <button
          onClick={() => setSelected({ mode: 'new' })}
          className="text-[12px] px-3 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] font-semibold hover:opacity-90 transition-opacity"
        >
          + Add preorder
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
        <table className="w-full border-collapse min-w-[820px]">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              {['', 'Artist — Title', 'Format', 'Price', 'ETA', ''].map((h, i) => (
                <th key={i} className={thCls}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <EmptyRow cols={6}>Loading…</EmptyRow>}
            {!loading && rows.length === 0 && (
              <EmptyRow cols={6}>
                {debouncedQ
                  ? 'No preorders match your search.'
                  : scope === 'overdue'
                    ? 'Nothing overdue — nice.'
                    : 'No preorders yet — add one to start committing customers early.'}
              </EmptyRow>
            )}
            {rows.map(r => (
              <PreorderRow
                key={r.id}
                r={r}
                onEditEta={() => setSelected({ mode: 'edit', release: r })}
                onRemove={() => onRemove(r)}
                onOpen={() => navigate(`/inventory/${r.id}/edit`)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <AddPreorderDrawer
          key={selected.mode === 'edit' ? selected.release.id : 'new'}
          release={selected.mode === 'edit' ? selected.release : null}
          onClose={() => setSelected(null)}
          onSaved={() => { load(); setSelected(null); }}
          onToast={showToast}
        />
      )}
    </div>
  );
}

/** Format the ETA cell: date + a "in N days" / "N days overdue" pill. */
function EtaCell({ eta }: { eta: string | null }) {
  if (!eta) return <span className="text-[var(--text-faint)]">—</span>;
  const d = new Date(eta);
  if (Number.isNaN(d.getTime())) return <span className="text-[var(--text-faint)]">—</span>;
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(d) - startOf(now)) / 86_400_000);
  const overdue = diffDays < 0;
  const label = overdue ? `${Math.abs(diffDays)} days overdue` : diffDays === 0 ? 'today' : `in ${diffDays} days`;
  const color = overdue ? 'var(--danger)' : diffDays <= 7 ? 'var(--warning)' : 'var(--text-muted)';
  return (
    <span className="inline-flex flex-col gap-0.5 whitespace-nowrap">
      <span className="text-[var(--text-primary)]">{fmtDate(eta)}</span>
      <span
        className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border border-[var(--border)] w-fit"
        style={{ color }}
      >
        <span className="w-1 h-1 rounded-full" style={{ background: color }} />
        {label}
      </span>
    </span>
  );
}

function PreorderRow({
  r, onEditEta, onRemove, onOpen,
}: {
  r: PreorderRelease;
  onEditEta: () => void;
  onRemove: () => void;
  onOpen: () => void;
}) {
  const initials = (r.artist || '?').trim().slice(0, 2).toUpperCase();
  return (
    <tr className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)]">
      <td className={tdCls}>
        <div className="w-9 h-9 rounded-[4px] overflow-hidden border border-[var(--border)] flex items-center justify-center relative">
          {r.imageUrl ? (
            <ReleaseCover imageUrl={r.imageUrl} format={r.format} alt={r.title} />
          ) : (
            <span className="text-[10px] font-mono text-[var(--text-muted)]">{initials}</span>
          )}
        </div>
      </td>
      <td className={`${tdCls} max-w-[280px] truncate`}>
        <p className="text-[var(--text-primary)] font-medium truncate">{r.artist}</p>
        <p className="text-[var(--text-muted)] text-[11px] truncate">{r.title}</p>
      </td>
      <td className={`${tdCls} text-[var(--text-muted)]`}>{r.format}</td>
      <td className={`${tdCls} font-mono text-right whitespace-nowrap text-[var(--text-primary)]`}>
        {fmtIdr(r.priceIdr)}
      </td>
      <td className={tdCls}>
        <EtaCell eta={r.preorderEta} />
      </td>
      <td className={`${tdCls} text-right whitespace-nowrap`}>
        <div className="inline-flex items-center gap-2">
          <button
            onClick={onEditEta}
            className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Edit ETA
          </button>
          <span className="text-[var(--text-faint)]">·</span>
          <button
            onClick={onOpen}
            className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Open release
          </button>
          <span className="text-[var(--text-faint)]">·</span>
          <button
            onClick={onRemove}
            className="text-[11px] text-[var(--danger)] hover:opacity-80"
          >
            Remove
          </button>
        </div>
      </td>
    </tr>
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

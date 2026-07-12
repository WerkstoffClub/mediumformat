import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fmtDate } from '../../api/ops';
import {
  deleteSubscriber, exportSubscribersCsvUrl, importSubscribersCsv,
  listSubscribers, unsubscribeSubscriber,
  type NewsletterSource, type Subscriber,
} from '../../api/newsletter';
import { EmptyRow, SearchBox, tdCls, thCls } from '../../components/ui/Page';
import { SubscriberDrawer } from './SubscriberDrawer';

const SOURCE_LABEL: Record<NewsletterSource, string> = {
  STOREFRONT: 'Storefront',
  CHECKOUT:   'Checkout',
  POS:        'POS',
  MANUAL:     'Manual',
  IMPORT:     'Import',
};

const SOURCES: Array<NewsletterSource | ''> = ['', 'STOREFRONT', 'CHECKOUT', 'POS', 'MANUAL', 'IMPORT'];

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function SubscribersTab() {
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q, 300);
  const [source, setSource] = useState<NewsletterSource | ''>('');
  const [tag, setTag] = useState('');
  const debouncedTag = useDebounced(tag, 300);

  const [rows, setRows] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  // Selection is either the full Subscriber (edit), 'new' (fresh), or null (closed).
  const [selected, setSelected] = useState<Subscriber | 'new' | null>(null);

  // Unfiltered slice for KPIs (cap 200).
  const [kpiRows, setKpiRows] = useState<Subscriber[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    listSubscribers({
      limit: 100,
      q: debouncedQ || undefined,
      source: source || undefined,
      tag: debouncedTag || undefined,
    })
      .then(r => { setRows(r.items); setTotal(r.total); })
      .catch(() => { setRows([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [debouncedQ, source, debouncedTag]);

  const loadKpi = useCallback(() => {
    listSubscribers({ limit: 200 })
      .then(r => setKpiRows(r.items))
      .catch(() => setKpiRows([]));
  }, []);

  useEffect(load, [load]);
  useEffect(loadKpi, [loadKpi]);

  const showToast = useCallback((kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(t => (t?.text === text ? null : t)), 4000);
  }, []);

  const kpi = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const newThisMonth = kpiRows.filter(s =>
      new Date(s.subscribedAt).getTime() >= monthStart,
    ).length;
    const active = kpiRows.filter(s => s.unsubscribedAt === null).length;
    const unsub = kpiRows.filter(s => s.unsubscribedAt !== null).length;
    return {
      total: kpiRows.length,
      newThisMonth,
      active,
      unsub,
    };
  }, [kpiRows]);

  const fileRef = useRef<HTMLInputElement>(null);
  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await importSubscribersCsv(file);
      showToast('ok', `Imported ${res.added} (skipped ${res.skipped}).`);
      load();
      loadKpi();
    } catch {
      showToast('err', 'Import failed.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onUnsub = async (s: Subscriber) => {
    if (s.unsubscribedAt) return;
    if (!confirm(`Unsubscribe ${s.email}?`)) return;
    try {
      await unsubscribeSubscriber(s.id);
      showToast('ok', 'Subscriber unsubscribed.');
      load();
      loadKpi();
    } catch {
      showToast('err', 'Could not unsubscribe.');
    }
  };

  const onDelete = async (s: Subscriber) => {
    if (!confirm(`Delete ${s.email}? This can't be undone.`)) return;
    try {
      await deleteSubscriber(s.id);
      showToast('ok', 'Subscriber deleted.');
      load();
      loadKpi();
    } catch {
      showToast('err', 'Delete failed.');
    }
  };

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-4 max-md:grid-cols-2">
        <KpiTile label="Total" value={String(kpi.total)} meta="On the list" />
        <KpiTile label="New this month" value={String(kpi.newThisMonth)} meta="Fresh signups" />
        <KpiTile label="Active" value={String(kpi.active)} meta="Never unsubscribed" />
        <KpiTile label="Unsubscribed" value={String(kpi.unsub)} meta="Won’t receive campaigns" />
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SearchBox value={q} onChange={setQ} placeholder="Search email…" />
        <select
          value={source}
          onChange={e => setSource(e.target.value as NewsletterSource | '')}
          className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[6px] px-2 py-1.5 text-[11px] text-[var(--text-primary)] outline-none"
        >
          {SOURCES.map(s => (
            <option key={s || 'all'} value={s}>
              {s ? SOURCE_LABEL[s] : 'All sources'}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={tag}
          onChange={e => setTag(e.target.value)}
          placeholder="Filter by tag…"
          className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[6px] px-2 py-1.5 text-[11px] text-[var(--text-primary)] outline-none w-[160px] placeholder:text-[var(--text-faint)]"
        />
        <div className="flex-1" />
        <a
          href={exportSubscribersCsvUrl()}
          download
          className="text-[12px] px-3 py-2 rounded-[6px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors"
        >
          Export CSV
        </a>
        <label className="text-[12px] px-3 py-2 rounded-[6px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors cursor-pointer">
          Import CSV
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onImport}
            className="hidden"
          />
        </label>
        <button
          onClick={() => setSelected('new')}
          className="text-[12px] px-3 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] font-semibold hover:opacity-90 transition-opacity"
        >
          + Add subscriber
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
              {['Email', 'Name', 'Source', 'Tags', 'Subscribed', 'Status', ''].map(h => (
                <th key={h} className={thCls}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <EmptyRow cols={7}>Loading…</EmptyRow>}
            {!loading && rows.length === 0 && (
              <EmptyRow cols={7}>
                {debouncedQ || source || debouncedTag
                  ? 'No subscribers match your filters.'
                  : 'No subscribers yet — add one, or import a CSV.'}
              </EmptyRow>
            )}
            {rows.map(s => (
              <tr
                key={s.id}
                onClick={() => setSelected(s)}
                className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                <td className={`${tdCls} text-[var(--text-primary)] max-w-[240px] truncate`}>{s.email}</td>
                <td className={`${tdCls} text-[var(--text-muted)]`}>{s.name ?? '—'}</td>
                <td className={tdCls}>
                  <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)] whitespace-nowrap">
                    {SOURCE_LABEL[s.source]}
                  </span>
                </td>
                <td className={tdCls}>
                  {s.tags.length === 0 ? (
                    <span className="text-[var(--text-faint)]">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {s.tags.map(t => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-overlay)] text-[var(--text-secondary)] whitespace-nowrap">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className={`${tdCls} text-[var(--text-muted)] whitespace-nowrap`}>{fmtDate(s.subscribedAt)}</td>
                <td className={tdCls}>
                  <SubStatusPill unsubscribedAt={s.unsubscribedAt} />
                </td>
                <td className={`${tdCls} text-right whitespace-nowrap`} onClick={e => e.stopPropagation()}>
                  <div className="inline-flex items-center gap-2">
                    {!s.unsubscribedAt && (
                      <>
                        <button
                          onClick={() => onUnsub(s)}
                          className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          Unsubscribe
                        </button>
                        <span className="text-[var(--text-faint)]">·</span>
                      </>
                    )}
                    <button
                      onClick={() => onDelete(s)}
                      className="text-[11px] text-[var(--danger)] hover:opacity-80"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-3.5 py-2 border-t border-[var(--border-sub)] text-[10px] text-[var(--text-faint)]">
          {rows.length} shown · {total} total
        </div>
      </div>

      {selected && (
        <SubscriberDrawer
          key={selected === 'new' ? 'new' : selected.id}
          subscriber={selected === 'new' ? null : selected}
          onClose={() => setSelected(null)}
          onSaved={() => { load(); loadKpi(); setSelected(null); }}
          onToast={showToast}
        />
      )}
    </div>
  );
}

function SubStatusPill({ unsubscribedAt }: { unsubscribedAt: string | null }) {
  const active = unsubscribedAt === null;
  const color = active ? 'var(--success)' : 'var(--text-muted)';
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] whitespace-nowrap"
      style={{ color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {active ? 'Active' : 'Unsubscribed'}
    </span>
  );
}

function KpiTile({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] px-4 py-3">
      <span className="block text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--text-muted)]">{label}</span>
      <span className="block font-mono text-[22px] font-medium tracking-[-0.02em] text-[var(--text-primary)] mt-1.5 [font-variant-numeric:tabular-nums]">
        {value}
      </span>
      <span className="block text-[11px] text-[var(--text-faint)] mt-1">{meta}</span>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { fmtDate } from '../../api/ops';
import {
  deleteSubscriber, importSubscribersCsv, listSubscribers, unsubscribeSubscriber,
  type NewsletterSource, type Subscriber,
} from '../../api/newsletter';
import { EmptyRow, Paginator, SearchBox, StatusPill, Widget } from '../../components/ui/Page';
import { SOURCE_LABEL, td, th, useDebounced, type ToastFn } from './shared';

const LIMIT = 25;
const SOURCES = Object.keys(SOURCE_LABEL) as NewsletterSource[];

const ctl = 'bg-[var(--bg-surface)] border border-[var(--border)] rounded-[6px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none';
const btnSec = 'text-[12px] px-3 py-1.5 rounded-[6px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer whitespace-nowrap';

export const initials = (s: Pick<Subscriber, 'name' | 'email'>) =>
  (s.name ?? s.email).split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('');

export function Avatar({ s }: { s: Pick<Subscriber, 'name' | 'email'> }) {
  return (
    <span className="w-[30px] h-[30px] rounded-full bg-[var(--bg-overlay)] border border-[var(--border)] text-[11px] font-medium text-[var(--text-secondary)] flex items-center justify-center flex-shrink-0">
      {initials(s)}
    </span>
  );
}

interface Props {
  reloadKey: number;
  onOpen: (s: Subscriber | 'new') => void;
  onChanged: () => void;
  onToast: ToastFn;
}

export function SubscribersPanel({ reloadKey, onOpen, onChanged, onToast }: Props) {
  const [q, setQ] = useState('');
  const [source, setSource] = useState<NewsletterSource | ''>('');
  const [tag, setTag] = useState('');
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounced(q);
  const debouncedTag = useDebounced(tag);

  const [rows, setRows] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setPage(1); }, [debouncedQ, source, debouncedTag]);

  useEffect(() => {
    setLoading(true);
    listSubscribers({
      page, limit: LIMIT,
      q: debouncedQ || undefined, source: source || undefined, tag: debouncedTag || undefined,
    })
      .then(r => { setRows(r.items); setTotal(r.total); })
      .catch(() => { setRows([]); setTotal(0); onToast('err', 'Could not load subscribers.'); })
      .finally(() => setLoading(false));
  }, [page, debouncedQ, source, debouncedTag, reloadKey, onToast]);

  const fileRef = useRef<HTMLInputElement>(null);
  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await importSubscribersCsv(file);
      onToast('ok', `Imported ${res.added} (skipped ${res.skipped}).`);
      onChanged();
    } catch {
      onToast('err', 'Import failed.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onUnsub = async (s: Subscriber) => {
    if (s.unsubscribedAt || !confirm(`Unsubscribe ${s.email}?`)) return;
    try {
      await unsubscribeSubscriber(s.id);
      onToast('ok', 'Subscriber unsubscribed.');
      onChanged();
    } catch {
      onToast('err', 'Could not unsubscribe.');
    }
  };

  const onDelete = async (s: Subscriber) => {
    if (!confirm(`Delete ${s.email}? This can't be undone.`)) return;
    try {
      await deleteSubscriber(s.id);
      onToast('ok', 'Subscriber deleted.');
      onChanged();
    } catch {
      onToast('err', 'Delete failed.');
    }
  };

  const filtered = Boolean(debouncedQ || source || debouncedTag);

  return (
    <Widget title="Subscribers" note={`${total.toLocaleString('id-ID')} ${filtered ? 'matching' : 'total'}`}>
      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-[var(--border)]">
        <SearchBox value={q} onChange={setQ} placeholder="Search email…" />
        <select aria-label="Source" value={source} onChange={e => setSource(e.target.value as NewsletterSource | '')} className={ctl}>
          <option value="">All sources</option>
          {SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
        </select>
        <input
          aria-label="Tag"
          value={tag}
          onChange={e => setTag(e.target.value)}
          placeholder="Filter by tag…"
          className={`${ctl} w-[150px] placeholder:text-[var(--text-faint)]`}
        />
        <div className="flex-1" />
        <label className={btnSec}>
          Import CSV
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onImport} className="hidden" />
        </label>
        <button onClick={() => onOpen('new')} className={btnSec}>+ Add subscriber</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>Subscriber</th>
              <th className={th}>Source</th>
              <th className={`${th} max-md:hidden`}>Tags</th>
              <th className={`${th} max-md:hidden`}>Subscribed</th>
              <th className={th}>Status</th>
              <th className={th}><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {loading && <EmptyRow cols={6}>Loading…</EmptyRow>}
            {!loading && rows.length === 0 && (
              <EmptyRow cols={6}>
                {filtered ? 'No subscribers match your filters.' : 'No subscribers yet — add one, or import a CSV.'}
              </EmptyRow>
            )}
            {!loading && rows.map(s => (
              <tr key={s.id} onClick={() => onOpen(s)} className="cursor-pointer transition-colors hover:[&>td]:bg-[var(--bg-hover)]">
                <td className={`${td} max-w-[300px]`}>
                  <div className="flex items-center gap-[11px] min-w-0">
                    <Avatar s={s} />
                    <div className="min-w-0">
                      <div className="text-[var(--text-primary)] truncate">{s.name ?? s.email}</div>
                      {s.name && <div className="text-[11px] text-[var(--text-muted)] truncate">{s.email}</div>}
                    </div>
                  </div>
                </td>
                <td className={td}>
                  <span className="inline-flex text-[11px] px-2 py-0.5 rounded-[4px] border border-[var(--border)] text-[var(--text-secondary)] whitespace-nowrap">
                    {SOURCE_LABEL[s.source]}
                  </span>
                </td>
                <td className={`${td} max-md:hidden`}>
                  {s.tags.length === 0 ? <span className="text-[var(--text-faint)]">—</span> : (
                    <div className="flex flex-wrap gap-1">
                      {s.tags.map(t => (
                        <span key={t} className="text-[11px] px-1.5 py-0.5 rounded-full bg-[var(--bg-overlay)] text-[var(--text-secondary)] whitespace-nowrap">{t}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td className={`${td} text-[12px] text-[var(--text-muted)] whitespace-nowrap max-md:hidden`}>{fmtDate(s.subscribedAt)}</td>
                <td className={td}><StatusPill value={s.unsubscribedAt ? 'Unsubscribed' : 'Active'} /></td>
                <td className={`${td} text-right whitespace-nowrap`} onClick={e => e.stopPropagation()}>
                  {!s.unsubscribedAt && (
                    <>
                      <button onClick={() => onUnsub(s)} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">Unsubscribe</button>
                      <span className="text-[var(--text-faint)] mx-1.5">·</span>
                    </>
                  )}
                  <button onClick={() => onDelete(s)} className="text-[11px] text-[var(--danger)] hover:opacity-80">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginator page={page} limit={LIMIT} total={total} shown={rows.length} onPage={setPage} />
    </Widget>
  );
}

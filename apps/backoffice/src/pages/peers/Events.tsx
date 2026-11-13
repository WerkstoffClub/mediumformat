import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { EVENT_STATUS_LABEL, listEvents, peersSummary, type EventRow, type EventStatus, type PeersSummary } from '../../api/peers';
import { EmptyRow, PageHeader, Paginator, SearchBox, Stat, StatusPill, Widget, tdCls, thCls } from '../../components/ui/Page';
import { Segmented, btnGhost, btnPrimary, useToast } from '../../components/ui/Drawer';
import { fmtNum, fmtPct, fmtRp, fmtRpShort, fmtShowTime } from '../../lib/idFormat';
import { EventDrawer } from './EventDrawer';

type Scope = 'upcoming' | 'past' | 'all';
const SCOPES: { value: Scope; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }, { value: 'all', label: 'All' },
];
const STATUS_FILTER: { value: 'all' | EventStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  ...(Object.keys(EVENT_STATUS_LABEL) as EventStatus[]).map(s => ({ value: s, label: EVENT_STATUS_LABEL[s] })),
];
const LIMIT = 50;

export function Events() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const scope = (params.get('scope') as Scope) || 'upcoming';
  const status = (params.get('status') as 'all' | EventStatus) || 'all';
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<EventRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<PeersSummary | null>(null);
  const [adding, setAdding] = useState(false);
  const [toast, showToast] = useToast();

  const setParam = (k: string, v: string, dflt: string) => {
    setParams(prev => { const p = new URLSearchParams(prev); if (v === dflt) p.delete(k); else p.set(k, v); return p; }, { replace: true });
    setPage(1);
  };

  const load = useCallback(() => {
    setRows(null);
    listEvents({ scope, status, q: q || undefined, page, limit: LIMIT })
      .then(r => { setRows(r.items); setTotal(r.total); })
      .catch(() => { setRows([]); setTotal(0); });
  }, [scope, status, q, page]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { peersSummary(30).then(setSummary).catch(() => setSummary(null)); }, []);

  return (
    <div>
      <PageHeader
        title="Peers · Shows & tickets"
        sub="Shows at Peers venues · tiers, ticket sales and door check-in"
        actions={
          <div className="flex gap-2">
            <Link to="/checkin" className={btnGhost}>Door check-in</Link>
            <button className={btnPrimary} onClick={() => setAdding(true)}>New show</button>
          </div>
        }
      />
      {toast}
      <div className="grid grid-cols-4 gap-3 mb-4 max-md:grid-cols-2">
        <Stat label="Upcoming" value={summary ? fmtNum(summary.upcoming) : '—'}>published shows</Stat>
        <Stat label="Tickets sold · 30D" value={summary ? fmtNum(summary.tickets) : '—'}>{summary ? fmtRpShort(summary.revenue) : '—'} ticket revenue</Stat>
        <Stat label="Check-in rate" value={fmtPct(summary?.checkinRate)}>shows already started</Stat>
        <Stat label="Venues selling" value={summary ? fmtNum(summary.byVenue.length) : '—'}>with sales in 30D</Stat>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Segmented value={scope} options={SCOPES} onChange={v => setParam('scope', v, 'upcoming')} />
        <select
          aria-label="Status"
          value={status}
          onChange={e => setParam('status', e.target.value, 'all')}
          className="text-[12px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-[6px] px-2 py-1.5 text-[var(--text-secondary)]"
        >
          {STATUS_FILTER.map(s => <option key={s.value} value={s.value}>Status: {s.label}</option>)}
        </select>
        <div className="flex-1" />
        <SearchBox value={q} onChange={v => { setQ(v); setPage(1); }} placeholder="Search shows…" />
      </div>

      <Widget title="Shows" note={`${fmtNum(total)} shows`}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead><tr>{['Date', 'Show', 'Venue', 'Tiers', 'Price from', 'Quota', 'Sold', 'Status'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody>
              {!rows && <EmptyRow cols={8}>Loading…</EmptyRow>}
              {rows?.length === 0 && <EmptyRow cols={8}>{q || status !== 'all' ? 'No shows match these filters.' : 'No shows yet — create one from a venue or with New show.'}</EmptyRow>}
              {rows?.map(e => (
                <tr key={e.id} onClick={() => nav(`/events/${e.id}`)} className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)] cursor-pointer">
                  <td className={`${tdCls} whitespace-nowrap text-[var(--text-secondary)]`}>{fmtShowTime(e.startsAt)}</td>
                  <td className={tdCls}>
                    <p className="font-medium text-[var(--text-primary)]">{e.title}</p>
                    {e.lineup && <p className="text-[10.5px] text-[var(--text-muted)]">{e.lineup}</p>}
                  </td>
                  <td className={tdCls}>
                    <p className="text-[var(--text-secondary)]">{e.venue.name}</p>
                    {e.venue.area && <p className="text-[10.5px] text-[var(--text-muted)]">{e.venue.area}</p>}
                  </td>
                  <td className={`${tdCls} font-mono text-right`}>{fmtNum(e.tierCount)}</td>
                  <td className={`${tdCls} font-mono text-right`}>{e.priceFrom != null ? fmtRp(e.priceFrom) : '—'}</td>
                  <td className={`${tdCls} font-mono text-right`}>{e.quota ? fmtNum(e.quota) : '—'}</td>
                  <td className={`${tdCls} font-mono text-right`}>{fmtNum(e.sold)}</td>
                  <td className={tdCls}><StatusPill value={EVENT_STATUS_LABEL[e.status]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Paginator page={page} limit={LIMIT} total={total} shown={rows?.length ?? 0} onPage={setPage} />
      </Widget>

      {adding && <EventDrawer event={null} onClose={() => setAdding(false)} onToast={showToast} onSaved={id => nav(`/events/${id}`)} />}
    </div>
  );
}

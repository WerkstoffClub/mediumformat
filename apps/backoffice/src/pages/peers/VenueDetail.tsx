import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  deleteVenue, EVENT_STATUS_LABEL, getVenue, listEvents, VENUE_STATUS_LABEL,
  type EventRow, type Venue,
} from '../../api/peers';
import { EmptyRow, Stat, StatusPill, Widget, tdCls, thCls } from '../../components/ui/Page';
import { btnGhost, btnPrimary, errMsg, useToast } from '../../components/ui/Drawer';
import { fmtNum, fmtRp, fmtRpShort, fmtShowTime } from '../../lib/idFormat';
import { VenueDrawer } from './VenueDrawer';
import { EventDrawer } from './EventDrawer';

export function VenueDetail() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [shows, setShows] = useState<EventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [toast, showToast] = useToast();

  const load = useCallback(() => {
    getVenue(id).then(setVenue).catch(e => setError(errMsg(e, 'Could not load venue.')));
    listEvents({ venueId: id, scope: 'all', limit: 200 }).then(r => setShows(r.items)).catch(() => setShows([]));
  }, [id]);
  useEffect(load, [load]);

  if (error) return <p className="text-[12px] text-[var(--danger)]">{error}</p>;
  if (!venue) return <p className="text-[12px] text-[var(--text-faint)]">Loading…</p>;

  const now = Date.now();
  const upcoming = (shows ?? []).filter(s => new Date(s.endsAt ?? s.startsAt).getTime() >= now && s.status !== 'CANCELLED');
  const fee = Number(venue.feePct);
  const net = Math.round(venue.revenue30d * (1 - fee / 100));

  const remove = async () => {
    if (!confirm(`Delete venue ${venue.name}?`)) return;
    try { await deleteVenue(venue.id); nav('/peers'); } catch (e) { showToast('err', errMsg(e, 'Delete failed.')); }
  };

  return (
    <div>
      <Link to="/peers" className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">← Venues</Link>
      <div className="flex items-start justify-between gap-3 mt-2 mb-4 flex-wrap">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.04em] leading-8 text-[var(--text-primary)]">{venue.name}</h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5 flex items-center gap-2 flex-wrap">
            Peers venue{venue.kind ? ` · ${venue.kind}` : ''} · {[venue.area, venue.city].filter(Boolean).join(', ')}
            {venue.capacity ? ` · capacity ~${fmtNum(venue.capacity)}` : ''}
            <StatusPill value={VENUE_STATUS_LABEL[venue.status]} />
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/checkin" className={btnGhost}>Door check-in</Link>
          <button className={btnGhost} onClick={() => setEditing(true)}>Edit venue</button>
          <button className={btnPrimary} onClick={() => setAdding(true)}>Add show</button>
        </div>
      </div>
      {toast}
      <div className="grid grid-cols-4 gap-3 mb-4 max-md:grid-cols-2">
        <Stat label="Upcoming shows" value={fmtNum(upcoming.length)}>{fmtNum(upcoming.filter(s => s.status === 'ON_SALE').length)} on sale</Stat>
        <Stat label="Tickets sold · 30D" value={fmtNum(venue.sold30d)}>all shows at this venue</Stat>
        <Stat label="Ticket revenue · 30D" value={fmtRpShort(venue.revenue30d)}>net to venue {fmtRpShort(net)}</Stat>
        <Stat label="MF fee" value={`${String(fee).replace('.', ',')}%`}>{venue.contact ?? 'No contact on file'}</Stat>
      </div>

      <Widget title="Schedule" note={shows ? `${fmtNum(shows.length)} shows` : undefined}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[760px]">
            <thead><tr>{['Date', 'Show', 'From', 'Sold / quota', 'Left', 'Status'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody>
              {!shows && <EmptyRow cols={6}>Loading…</EmptyRow>}
              {shows?.length === 0 && <EmptyRow cols={6}>No shows yet — add the first one.</EmptyRow>}
              {shows?.map(s => (
                <tr key={s.id} onClick={() => nav(`/events/${s.id}`)} className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)] cursor-pointer">
                  <td className={`${tdCls} whitespace-nowrap text-[var(--text-secondary)]`}>{fmtShowTime(s.startsAt)}</td>
                  <td className={tdCls}>
                    <p className="font-medium text-[var(--text-primary)]">{s.title}</p>
                    {s.lineup && <p className="text-[10.5px] text-[var(--text-muted)]">{s.lineup}</p>}
                  </td>
                  <td className={`${tdCls} font-mono text-right`}>{s.priceFrom != null ? fmtRp(s.priceFrom) : '—'}</td>
                  <td className={`${tdCls} font-mono text-right`}>{fmtNum(s.sold)} / {fmtNum(s.quota)}</td>
                  <td className={`${tdCls} font-mono text-right`}>{s.quota ? fmtNum(s.quota - s.sold) : '—'}</td>
                  <td className={tdCls}><StatusPill value={EVENT_STATUS_LABEL[s.status]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Widget>

      {venue.notes && <p className="mt-4 text-[12px] text-[var(--text-muted)] whitespace-pre-line">{venue.notes}</p>}
      <button onClick={remove} className="mt-6 text-[11px] text-[var(--text-faint)] hover:text-[var(--danger)]">Delete venue</button>

      {editing && <VenueDrawer venue={venue} onClose={() => setEditing(false)} onToast={showToast} onSaved={load} />}
      {adding && <EventDrawer event={null} venueId={venue.id} onClose={() => setAdding(false)} onToast={showToast} onSaved={eid => nav(`/events/${eid}`)} />}
    </div>
  );
}

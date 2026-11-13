import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listVenues, VENUE_STATUS_LABEL, type VenueRow } from '../../api/peers';
import { EmptyRow, PageHeader, Stat, StatusPill, Widget, tdCls, thCls } from '../../components/ui/Page';
import { btnGhost, btnPrimary, useToast } from '../../components/ui/Drawer';
import { fmtNum, fmtRpShort, fmtShowTime } from '../../lib/idFormat';
import { VenueDrawer } from './VenueDrawer';

export function Venues() {
  const nav = useNavigate();
  const [rows, setRows] = useState<VenueRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [toast, showToast] = useToast();

  const load = useCallback(() => {
    listVenues().then(r => { setRows(r); setFailed(false); }).catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);

  const kpi = useMemo(() => {
    const r = rows ?? [];
    const live = r.filter(v => v.status === 'LIVE');
    return {
      live: live.length,
      pipeline: r.length - live.length,
      upcoming: live.reduce((n, v) => n + v.upcomingCount, 0),
      sold: r.reduce((n, v) => n + v.sold30d, 0),
      revenue: r.reduce((n, v) => n + v.revenue30d, 0),
    };
  }, [rows]);

  return (
    <div>
      <PageHeader
        title="Peers · Venues"
        sub="Venues that host shows and sell tickets through Medium Format — schedules, ticket sales and door check-in"
        actions={
          <div className="flex gap-2">
            <Link to="/events" className={btnGhost}>All shows</Link>
            <button className={btnPrimary} onClick={() => setAdding(true)}>Invite venue</button>
          </div>
        }
      />
      {toast}
      <div className="grid grid-cols-4 gap-3 mb-4 max-md:grid-cols-2">
        <Stat label="Live venues" value={fmtNum(kpi.live)}>{fmtNum(kpi.pipeline)} in pipeline</Stat>
        <Stat label="Upcoming shows" value={fmtNum(kpi.upcoming)}>across live venues</Stat>
        <Stat label="Tickets sold · 30D" value={fmtNum(kpi.sold)}>venue-hosted shows</Stat>
        <Stat label="Ticket revenue · 30D" value={fmtRpShort(kpi.revenue)}>before MF fee</Stat>
      </div>

      <Widget title="Venues" note={rows ? `${fmtNum(rows.length)} venues` : undefined}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[860px]">
            <thead>
              <tr>{['Venue', 'Type', 'Upcoming', 'Next show', 'Sold · 30D', 'Revenue · 30D', 'Status'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {failed && <EmptyRow cols={7}>Could not load venues.</EmptyRow>}
              {!failed && !rows && <EmptyRow cols={7}>Loading…</EmptyRow>}
              {rows?.length === 0 && <EmptyRow cols={7}>No venues yet — invite the first Peers venue to start selling tickets.</EmptyRow>}
              {rows?.map(v => (
                <tr key={v.id} onClick={() => nav(`/peers/${v.id}`)} className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)] cursor-pointer">
                  <td className={tdCls}>
                    <p className="font-medium text-[var(--text-primary)]">{v.name}</p>
                    <p className="text-[10.5px] text-[var(--text-muted)]">{[v.area, v.city].filter(Boolean).join(', ')}</p>
                  </td>
                  <td className={`${tdCls} text-[var(--text-secondary)]`}>{v.kind ?? '—'}</td>
                  <td className={`${tdCls} font-mono text-right`}>{fmtNum(v.upcomingCount)}</td>
                  <td className={`${tdCls} text-[var(--text-secondary)]`}>
                    {v.nextShow ? <>{fmtShowTime(v.nextShow.startsAt)} · {v.nextShow.title}</> : <span className="text-[var(--text-faint)]">No show scheduled</span>}
                  </td>
                  <td className={`${tdCls} font-mono text-right`}>{v.sold30d ? fmtNum(v.sold30d) : '—'}</td>
                  <td className={`${tdCls} font-mono text-right`}>{v.revenue30d ? fmtRpShort(v.revenue30d) : '—'}</td>
                  <td className={tdCls}><StatusPill value={VENUE_STATUS_LABEL[v.status]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Widget>

      {adding && (
        <VenueDrawer venue={null} onClose={() => setAdding(false)} onToast={showToast} onSaved={v => nav(`/peers/${v.id}`)} />
      )}
    </div>
  );
}

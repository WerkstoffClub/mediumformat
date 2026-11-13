import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CHANNEL_LABEL, EVENT_STATUS_LABEL, PAYMENT_LABEL, getEvent, listTickets, voidTicket,
  type EventDetail as Detail, type Ticket, type Tier,
} from '../../api/peers';
import { EmptyRow, Paginator, SearchBox, Stat, StatusPill, Widget, tdCls, thCls } from '../../components/ui/Page';
import { btnGhost, btnPrimary, errMsg, useToast } from '../../components/ui/Drawer';
import { fmtNum, fmtPct, fmtRp, fmtRpShort, fmtShowTime } from '../../lib/idFormat';
import { EventDrawer } from './EventDrawer';
import { TierDrawer } from './TierDrawer';
import { SellDrawer } from './SellDrawer';

const LIMIT = 50;

function tierStatus(t: Tier): string {
  if (t.sold >= t.quota) return 'Sold out';
  const now = Date.now();
  if (t.salesStart && new Date(t.salesStart).getTime() > now) return 'Scheduled';
  if (t.salesEnd && new Date(t.salesEnd).getTime() < now) return 'Ended';
  return 'On sale';
}

export function EventDetail() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [ev, setEv] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [ticketTotal, setTicketTotal] = useState(0);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(false);
  const [tierEdit, setTierEdit] = useState<Tier | 'new' | null>(null);
  const [selling, setSelling] = useState(false);
  const [toast, showToast] = useToast();

  const load = useCallback(() => {
    getEvent(id).then(setEv).catch(e => setError(errMsg(e, 'Could not load show.')));
  }, [id]);
  const loadTickets = useCallback(() => {
    listTickets(id, { q: q || undefined, page, limit: LIMIT })
      .then(r => { setTickets(r.items); setTicketTotal(r.total); })
      .catch(() => setTickets([]));
  }, [id, q, page]);
  useEffect(load, [load]);
  useEffect(() => { const t = setTimeout(loadTickets, 250); return () => clearTimeout(t); }, [loadTickets]);

  if (error) return <p className="text-[12px] text-[var(--danger)]">{error}</p>;
  if (!ev) return <p className="text-[12px] text-[var(--text-faint)]">Loading…</p>;

  const refresh = () => { load(); loadTickets(); };
  const sellable = ev.status === 'ON_SALE' || ev.status === 'SCHEDULED';
  const daysTo = Math.ceil((new Date(ev.startsAt).getTime() - Date.now()) / 86_400_000);

  const doVoid = async (t: Ticket) => {
    if (!confirm(`Void ticket ${t.code}? It will no longer pass the door.`)) return;
    try { await voidTicket(t.id); showToast('ok', `${t.code} voided.`); refresh(); }
    catch (e) { showToast('err', errMsg(e, 'Void failed.')); }
  };

  return (
    <div>
      <Link to="/events" className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">← Shows & tickets</Link>
      <div className="flex items-start justify-between gap-3 mt-2 mb-4 flex-wrap">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.04em] leading-8 text-[var(--text-primary)]">{ev.title}</h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5 flex items-center gap-2 flex-wrap">
            {fmtShowTime(ev.startsAt)} ·{' '}
            <Link to={`/peers/${ev.venue.id}`} className="hover:text-[var(--text-primary)] underline-offset-2 hover:underline">{ev.venue.name}</Link>
            {ev.venue.capacity ? ` · capacity ~${fmtNum(ev.venue.capacity)}` : ''}
            <StatusPill value={EVENT_STATUS_LABEL[ev.status]} />
          </p>
          {ev.lineup && <p className="text-[12px] text-[var(--text-secondary)] mt-1">{ev.lineup}</p>}
        </div>
        <div className="flex gap-2">
          <Link to={`/checkin?event=${ev.id}`} className={btnGhost}>Door check-in</Link>
          <button className={btnGhost} onClick={() => setEditing(true)}>Edit show</button>
          <button className={btnPrimary} disabled={!sellable || ev.tiers.length === 0} onClick={() => setSelling(true)} title={sellable ? undefined : 'Set the show to Scheduled or On sale to sell'}>Sell</button>
        </div>
      </div>
      {toast}

      <div className="grid grid-cols-4 gap-3 mb-4 max-md:grid-cols-2">
        <Stat label="Tickets sold" value={`${fmtNum(ev.sold)} / ${fmtNum(ev.quota)}`}>{ev.quota ? `${fmtPct(ev.sold / ev.quota)} of quota` : 'no tiers yet'}</Stat>
        <Stat label="Gross revenue" value={fmtRpShort(ev.revenue)}>before {String(Number(ev.venue.feePct)).replace('.', ',')}% MF fee</Stat>
        <Stat label="Checked in" value={fmtNum(ev.checkedIn)}>{ev.sold ? `${fmtPct(ev.checkedIn / ev.sold)} of sold` : '—'}</Stat>
        <Stat label="Days to show" value={daysTo >= 0 ? fmtNum(daysTo) : '—'}>{ev.doorsAt ? `doors ${fmtShowTime(ev.doorsAt)}` : 'doors not set'}</Stat>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-4 mb-4 max-lg:grid-cols-1">
        <Widget title="Ticket tiers" actions={<button className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]" onClick={() => setTierEdit('new')}>+ Add tier</button>}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[620px]">
              <thead><tr>{['Tier', 'Price', 'Quota', 'Sold', 'Revenue', 'Checked in', 'Status'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
              <tbody>
                {ev.tiers.length === 0 && <EmptyRow cols={7}>No tiers yet — add one to start selling.</EmptyRow>}
                {ev.tiers.map(t => (
                  <tr key={t.id} onClick={() => setTierEdit(t)} className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)] cursor-pointer">
                    <td className={`${tdCls} font-medium text-[var(--text-primary)]`}>{t.name}</td>
                    <td className={`${tdCls} font-mono text-right`}>{fmtRp(t.priceIdr)}</td>
                    <td className={`${tdCls} font-mono text-right`}>{fmtNum(t.quota)}</td>
                    <td className={`${tdCls} font-mono text-right`}>{fmtNum(t.sold)}</td>
                    <td className={`${tdCls} font-mono text-right`}>{fmtRp(t.revenue)}</td>
                    <td className={`${tdCls} font-mono text-right`}>{fmtNum(t.checkedIn)}</td>
                    <td className={tdCls}><StatusPill value={tierStatus(t)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Widget>
        <Widget title="Revenue by channel">
          <ul className="divide-y divide-[var(--border-sub)]">
            {ev.byChannel.length === 0 && <li className="px-4 py-6 text-center text-[11px] text-[var(--text-faint)]">No sales yet.</li>}
            {ev.byChannel.map(c => (
              <li key={`${c.channel}-${c.payment}`} className="flex items-center justify-between px-4 py-2.5 text-[12px]">
                <span className="text-[var(--text-secondary)]">{CHANNEL_LABEL[c.channel]}{c.payment !== 'NONE' ? ` · ${PAYMENT_LABEL[c.payment]}` : ''}</span>
                <span className="font-mono text-[var(--text-primary)]">{fmtNum(c.tickets)} · {fmtRpShort(c.revenue)}</span>
              </li>
            ))}
          </ul>
        </Widget>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <SearchBox value={q} onChange={v => { setQ(v); setPage(1); }} placeholder="Search code, name, email…" />
      </div>
      <Widget title="Tickets" note={`${fmtNum(ticketTotal)} issued`}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[820px]">
            <thead><tr>{['Code', 'Tier', 'Holder', 'Channel', 'Price', 'Issued', 'Door', ''].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody>
              {!tickets && <EmptyRow cols={8}>Loading…</EmptyRow>}
              {tickets?.length === 0 && <EmptyRow cols={8}>{q ? 'No tickets match.' : 'No tickets issued yet.'}</EmptyRow>}
              {tickets?.map(t => (
                <tr key={t.id} className="border-b border-[var(--border-sub)]">
                  <td className={`${tdCls} font-mono text-[var(--text-primary)]`}>{t.code}</td>
                  <td className={tdCls}>{t.tier.name}</td>
                  <td className={tdCls}>
                    <p className="text-[var(--text-secondary)]">{t.holderName ?? '—'}</p>
                    {t.holderEmail && <p className="text-[10.5px] text-[var(--text-muted)]">{t.holderEmail}</p>}
                  </td>
                  <td className={`${tdCls} text-[var(--text-secondary)]`}>{CHANNEL_LABEL[t.channel]}{t.payment !== 'NONE' ? ` · ${PAYMENT_LABEL[t.payment]}` : ''}</td>
                  <td className={`${tdCls} font-mono text-right`}>{fmtRp(t.priceIdr)}</td>
                  <td className={`${tdCls} text-[var(--text-muted)] whitespace-nowrap`}>{fmtShowTime(t.createdAt)}</td>
                  <td className={tdCls}>
                    <StatusPill value={t.status === 'VOID' ? 'Void' : t.checkedInAt ? 'Checked in' : 'Valid'} />
                    {t.checkedInAt && <p className="text-[10px] text-[var(--text-faint)] mt-0.5">{fmtShowTime(t.checkedInAt)}{t.gate ? ` · ${t.gate}` : ''}</p>}
                  </td>
                  <td className={`${tdCls} text-right`}>
                    {t.status === 'VALID' && !t.checkedInAt && (
                      <button className="text-[11px] text-[var(--text-faint)] hover:text-[var(--danger)]" onClick={() => doVoid(t)}>Void</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Paginator page={page} limit={LIMIT} total={ticketTotal} shown={tickets?.length ?? 0} onPage={setPage} />
      </Widget>

      {editing && <EventDrawer event={ev} onClose={() => setEditing(false)} onToast={showToast} onSaved={load} onDeleted={() => nav('/events')} />}
      {tierEdit && <TierDrawer eventId={ev.id} tier={tierEdit === 'new' ? null : tierEdit} onClose={() => setTierEdit(null)} onToast={showToast} onSaved={load} />}
      {selling && <SellDrawer eventId={ev.id} tiers={ev.tiers} onClose={() => setSelling(false)} onToast={showToast} onSold={refresh} />}
    </div>
  );
}

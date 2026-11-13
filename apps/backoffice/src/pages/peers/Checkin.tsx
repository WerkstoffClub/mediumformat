import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { checkin, checkinStats, listEvents, type CheckinStats, type EventRow, type ScanResult } from '../../api/peers';
import { EmptyRow, PageHeader, Stat, StatusPill, Widget, tdCls, thCls } from '../../components/ui/Page';
import { btnPrimary, errMsg, inputCls } from '../../components/ui/Drawer';
import { fmtClock, fmtNum, fmtPct, fmtRp, fmtShowTime } from '../../lib/idFormat';

const POLL_MS = 10_000;
const LOG_MAX = 30;
const GATE_KEY = 'mf-checkin-gate';

const RESULT_LABEL: Record<ScanResult, string> = {
  VALID: 'Valid', ALREADY: 'Already checked in', WRONG_EVENT: 'Wrong event', VOID: 'Void', NOT_FOUND: 'Not a ticket code',
};

interface LogRow { at: string; code: string; result: ScanResult; tier?: string; holder?: string | null; note?: string; gate: string; }

const readGate = () => { try { return localStorage.getItem(GATE_KEY) ?? 'Gate A'; } catch { return 'Gate A'; } };

/** Door check-in: works with USB / Bluetooth scanners (they type the code + Enter) or by hand. */
export function Checkin() {
  const [params, setParams] = useSearchParams();
  const [shows, setShows] = useState<EventRow[] | null>(null);
  const eventId = params.get('event') ?? '';
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [code, setCode] = useState('');
  const [gate, setGate] = useState(readGate);
  const [last, setLast] = useState<LogRow | null>(null);
  const [log, setLog] = useState<LogRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listEvents({ scope: 'upcoming', limit: 50 }).then(r => {
      const items = r.items.filter(e => e.status !== 'CANCELLED' && e.status !== 'DRAFT');
      setShows(items);
      if (!params.get('event') && items[0]) setParams({ event: items[0].id }, { replace: true });
    }).catch(() => setShows([]));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStats = useCallback(() => {
    if (!eventId) return;
    checkinStats(eventId).then(s => { setStats(s); setError(null); }).catch(e => setError(errMsg(e, 'Offline — retrying.')));
  }, [eventId]);
  useEffect(() => {
    setStats(null); setLog([]); setLast(null);
    loadStats();
    const t = setInterval(loadStats, POLL_MS);
    return () => clearInterval(t);
  }, [loadStats]);
  useEffect(() => { try { localStorage.setItem(GATE_KEY, gate); } catch { /* private mode */ } }, [gate]);

  const scan = async (e: React.FormEvent) => {
    e.preventDefault();
    // Read the DOM value: scanners send Enter right after the last char, before React state catches up.
    const raw = (inputRef.current?.value ?? code).trim();
    if (!eventId || !raw) return;
    setCode('');
    try {
      const r = await checkin(eventId, raw, gate);
      const t = r.ticket;
      const row: LogRow = {
        at: new Date().toISOString(), code: r.code, result: r.result, gate,
        tier: t?.tier.name, holder: t?.holderName,
        note: r.result === 'ALREADY' && t?.checkedInAt ? `First scan ${fmtClock(t.checkedInAt)}${t.gate ? ` · ${t.gate}` : ''}`
          : r.result === 'WRONG_EVENT' && t ? `${t.event.title} ticket` : undefined,
      };
      setLast(row);
      setLog(l => [row, ...l].slice(0, LOG_MAX));
      if (r.result === 'VALID') loadStats();
    } catch (err) {
      setError(errMsg(err, 'Scan failed — check connection.'));
    } finally {
      inputRef.current?.focus();
    }
  };

  const show = shows?.find(s => s.id === eventId);
  const ok = last?.result === 'VALID';

  return (
    <div>
      <PageHeader
        title="Door check-in"
        sub={show ? `Peers venue · ${show.title} · ${show.venue.name} · ${fmtShowTime(show.doorsAt ?? show.startsAt)}` : 'Pick a show to start scanning'}
        actions={<Link to="/events" className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">All shows</Link>}
      />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <select aria-label="Show" className={`${inputCls} max-w-md`} value={eventId} onChange={e => setParams({ event: e.target.value }, { replace: true })}>
          {!shows && <option>Loading…</option>}
          {shows?.length === 0 && <option value="">No upcoming shows</option>}
          {shows?.map(s => <option key={s.id} value={s.id}>{s.title} — {s.venue.name} · {fmtShowTime(s.startsAt)}</option>)}
        </select>
        <input aria-label="Gate" className={`${inputCls} w-32`} value={gate} onChange={e => setGate(e.target.value)} />
      </div>

      {error && <p role="alert" className="mb-3 text-[12px] text-[var(--warning)]">{error}</p>}

      <div className="grid grid-cols-[1fr_340px] gap-4 mb-4 max-lg:grid-cols-1">
        <Widget title="Scanner" note={gate}>
          <form onSubmit={scan} className="p-4 space-y-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                autoFocus
                aria-label="Ticket code"
                className={`${inputCls} font-mono text-[16px] tracking-[0.04em] uppercase py-2.5`}
                placeholder="Scan or type TK-XXXXXXXX"
                value={code}
                onChange={e => setCode(e.target.value)}
                disabled={!eventId}
              />
              <button className={btnPrimary} disabled={!eventId || !code.trim()}>Check in</button>
            </div>
            <p className="text-[11px] text-[var(--text-faint)]">Handheld scanners type the code and press Enter — keep this field focused. Type it by hand for damaged QR or phone screens.</p>
            {last && (
              <div
                role="status"
                className="rounded-[8px] border px-4 py-3"
                style={{ borderColor: ok ? 'var(--success)' : last.result === 'ALREADY' ? 'var(--warning)' : 'var(--danger)',
                         background: ok ? 'var(--success-t)' : last.result === 'ALREADY' ? 'var(--warning-t)' : 'var(--danger-t)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[15px] text-[var(--text-primary)]">{last.code}</span>
                  <StatusPill value={RESULT_LABEL[last.result]} />
                </div>
                <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                  {[last.tier, last.holder, last.gate, fmtClock(last.at)].filter(Boolean).join(' · ')}
                  {last.note ? ` — ${last.note}` : ''}
                </p>
              </div>
            )}
          </form>
        </Widget>

        <div className="space-y-4">
          <Stat label="Live count" value={stats ? `${fmtNum(stats.checkedIn)} / ${fmtNum(stats.sold)}` : '—'}>
            {stats ? <>{fmtPct(stats.sold ? stats.checkedIn / stats.sold : null)} in · {fmtNum(stats.sold - stats.checkedIn)} still to arrive · synced {fmtClock(stats.syncedAt)}</> : 'no show selected'}
          </Stat>
          <Widget title="By tier">
            <table className="w-full border-collapse">
              <thead><tr>{['Tier', 'Sold', 'In'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
              <tbody>
                {stats?.tiers.length === 0 && <EmptyRow cols={3}>No tiers.</EmptyRow>}
                {stats?.tiers.map(t => (
                  <tr key={t.id} className="border-b border-[var(--border-sub)]">
                    <td className={tdCls}>{t.name} <span className="text-[var(--text-faint)]">{fmtRp(t.priceIdr)}</span></td>
                    <td className={`${tdCls} font-mono text-right`}>{fmtNum(t.sold)}</td>
                    <td className={`${tdCls} font-mono text-right`}>{fmtNum(t.checkedIn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Widget>
          {stats && stats.gates.length > 0 && (
            <Widget title="Gates">
              <ul className="divide-y divide-[var(--border-sub)]">
                {stats.gates.map(g => (
                  <li key={g.gate} className="flex justify-between px-4 py-2 text-[12px]"><span>{g.gate}</span><span className="font-mono">{fmtNum(g.count)}</span></li>
                ))}
              </ul>
            </Widget>
          )}
        </div>
      </div>

      <Widget title="Recent scans" note={log.length ? 'this device' : 'all gates'}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[640px]">
            <thead><tr>{['Time', 'Code', 'Tier', 'Gate', 'Holder / note', 'Result'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody>
              {log.length > 0 ? log.map((r, i) => (
                <tr key={`${r.at}-${i}`} className="border-b border-[var(--border-sub)]">
                  <td className={`${tdCls} font-mono`}>{fmtClock(r.at)}</td>
                  <td className={`${tdCls} font-mono`}>{r.code}</td>
                  <td className={tdCls}>{r.tier ?? '—'}</td>
                  <td className={tdCls}>{r.gate}</td>
                  <td className={`${tdCls} text-[var(--text-secondary)]`}>{r.note ?? r.holder ?? '—'}</td>
                  <td className={tdCls}><StatusPill value={RESULT_LABEL[r.result]} /></td>
                </tr>
              )) : (
                <>
                  {(!stats || stats.recent.length === 0) && <EmptyRow cols={6}>No check-ins yet.</EmptyRow>}
                  {stats?.recent.map(t => (
                    <tr key={t.id} className="border-b border-[var(--border-sub)]">
                      <td className={`${tdCls} font-mono`}>{fmtClock(t.checkedInAt)}</td>
                      <td className={`${tdCls} font-mono`}>{t.code}</td>
                      <td className={tdCls}>{t.tier.name}</td>
                      <td className={tdCls}>{t.gate ?? '—'}</td>
                      <td className={`${tdCls} text-[var(--text-secondary)]`}>{t.holderName ?? '—'}</td>
                      <td className={tdCls}><StatusPill value="Valid" /></td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </Widget>
    </div>
  );
}

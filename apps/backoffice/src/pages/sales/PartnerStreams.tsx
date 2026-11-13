import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { peersSummary, type PeersSummary } from '../../api/peers';
import { dealersSummary, type DealersSummary } from '../../api/dealers';
import { BarChart } from '../../components/ui/BarChart';
import { EmptyRow, Stat, Widget, tdCls, thCls } from '../../components/ui/Page';
import { Segmented } from '../../components/ui/Drawer';
import { fmtNum, fmtPct, fmtRpShort } from '../../lib/idFormat';

type Days = '7' | '30' | '90';
const RANGES: { value: Days; label: string }[] = [
  { value: '7', label: '7D' }, { value: '30', label: '30D' }, { value: '90', label: '90D' },
];

/** Fill missing days so the chart has one bar per calendar day. */
function daySeries<T extends { date: string }>(rows: T[], days: number, pick: (r: T) => number) {
  const byDate = new Map(rows.map(r => [r.date, pick(r)]));
  const labels: string[] = [];
  const values: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    labels.push(d.slice(8, 10) + '/' + d.slice(5, 7));
    values.push(byDate.get(d) ?? 0);
  }
  return { labels, values };
}

function useSummary<T>(fetch: (days: number) => Promise<T>, days: Days) {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setData(null);
    fetch(Number(days)).then(d => { setData(d); setFailed(false); }).catch(() => setFailed(true));
  }, [fetch, days]);
  return { data, failed };
}

function RangeBar({ days, setDays, link }: { days: Days; setDays: (d: Days) => void; link: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Segmented value={days} options={RANGES} onChange={setDays} />
      <div className="flex-1" />
      {link}
    </div>
  );
}

const linkCls = 'text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)]';

/** Analytics · Peers stream — ticket sales only (never mixed with Dealers). */
export function PeersPanel() {
  const [days, setDays] = useState<Days>('30');
  const { data, failed } = useSummary<PeersSummary>(peersSummary, days);
  const n = Number(days);
  const chart = data ? daySeries(data.series, n, r => r.revenue) : null;
  return (
    <div>
      <RangeBar days={days} setDays={setDays} link={<Link to="/events" className={linkCls}>Shows & tickets →</Link>} />
      {failed && <p className="text-[12px] text-[var(--danger)] mb-3">Could not load Peers analytics.</p>}
      <div className="grid grid-cols-4 gap-3 mb-4 max-md:grid-cols-2">
        <Stat label={`Tickets sold · ${days}D`} value={data ? fmtNum(data.tickets) : '—'}>valid tickets</Stat>
        <Stat label={`Ticket revenue · ${days}D`} value={data ? fmtRpShort(data.revenue) : '—'}>before MF fee</Stat>
        <Stat label="Check-in rate" value={fmtPct(data?.checkinRate)}>shows already started</Stat>
        <Stat label="Upcoming shows" value={data ? fmtNum(data.upcoming) : '—'}>published</Stat>
      </div>
      <div className="grid grid-cols-[1fr_340px] gap-4 max-lg:grid-cols-1">
        <Widget title="Ticket revenue per day">
          <div className="p-4">
            {chart && <BarChart labels={chart.labels} series={[{ label: 'Revenue', values: chart.values }]} labelEvery={n > 30 ? 14 : n > 7 ? 5 : 1} format={fmtRpShort} />}
          </div>
        </Widget>
        <Widget title="By venue">
          <table className="w-full border-collapse">
            <thead><tr>{['Venue', 'Tickets', 'Revenue'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody>
              {data?.byVenue.length === 0 && <EmptyRow cols={3}>No ticket sales in this range.</EmptyRow>}
              {data?.byVenue.map(v => (
                <tr key={v.name} className="border-b border-[var(--border-sub)]">
                  <td className={tdCls}>{v.name}</td>
                  <td className={`${tdCls} font-mono text-right`}>{fmtNum(v.tickets)}</td>
                  <td className={`${tdCls} font-mono text-right`}>{fmtRpShort(v.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Widget>
      </div>
    </div>
  );
}

/** Analytics · Dealers stream — third-party POS sales only. */
export function DealersPanel() {
  const [days, setDays] = useState<Days>('30');
  const { data, failed } = useSummary<DealersSummary>(dealersSummary, days);
  const n = Number(days);
  const chart = data ? daySeries(data.series, n, r => r.amount) : null;
  return (
    <div>
      <RangeBar days={days} setDays={setDays} link={<Link to="/dealers" className={linkCls}>Dealers →</Link>} />
      {failed && <p className="text-[12px] text-[var(--danger)] mb-3">Could not load Dealers analytics.</p>}
      <div className="grid grid-cols-4 gap-3 mb-4 max-md:grid-cols-2">
        <Stat label={`POS sales · ${days}D`} value={data ? fmtRpShort(data.amount) : '—'}>paid transactions</Stat>
        <Stat label={`Transactions · ${days}D`} value={data ? fmtNum(data.txns) : '—'}>avg basket {data ? fmtRpShort(data.avgBasket) : '—'}</Stat>
        <Stat label="Live dealers" value={data ? fmtNum(data.live) : '—'}>on MF POS</Stat>
        <Stat label="Dealers selling" value={data ? fmtNum(data.byDealer.length) : '—'}>with sales in range</Stat>
      </div>
      <div className="grid grid-cols-[1fr_340px] gap-4 max-lg:grid-cols-1">
        <Widget title="Dealer POS sales per day">
          <div className="p-4">
            {chart && <BarChart labels={chart.labels} series={[{ label: 'Sales', values: chart.values }]} labelEvery={n > 30 ? 14 : n > 7 ? 5 : 1} format={fmtRpShort} />}
          </div>
        </Widget>
        <Widget title="By dealer">
          <table className="w-full border-collapse">
            <thead><tr>{['Dealer', 'Txns', 'Sales'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody>
              {data?.byDealer.length === 0 && <EmptyRow cols={3}>No dealer sales in this range.</EmptyRow>}
              {data?.byDealer.map(d => (
                <tr key={d.name} className="border-b border-[var(--border-sub)]">
                  <td className={tdCls}>{d.name}</td>
                  <td className={`${tdCls} font-mono text-right`}>{fmtNum(d.txns)}</td>
                  <td className={`${tdCls} font-mono text-right`}>{fmtRpShort(d.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Widget>
      </div>
    </div>
  );
}

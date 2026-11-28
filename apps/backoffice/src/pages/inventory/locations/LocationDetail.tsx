import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  formatDateRange, getLocationReport, getLocations, getLocationStock,
  type Location, type LocationReport, type LocationStockRow,
} from '../../../api/locations';
import { BarChart } from '../../../components/ui/BarChart';
import { EmptyRow, Stat, Widget, tdCls, thCls } from '../../../components/ui/Page';
import { btnGhost, btnPrimary, errMsg, useToast } from '../../../components/ui/Drawer';
import { fmtNum, fmtPct, fmtRp, fmtRpShort } from '../../../lib/idFormat';
import { MoveStockModal, RecordSalesModal } from './StockModals';

const KIND_LABEL: Record<string, string> = {
  RETAIL: 'Retail floor', STORAGE: 'Storage', TEMPORARY: 'Event · pop-up', CONSIGNMENT: 'Consignment',
};
const DAY = 86_400_000;
const wibDate = (d: Date) => new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);

type RangeKey = 'event' | '7' | '30' | '90';

function rangeFor(key: RangeKey): { from?: string; to?: string } {
  if (key === 'event') return {};
  const to = new Date();
  return { from: wibDate(new Date(to.getTime() - (Number(key) - 1) * DAY)), to: wibDate(to) };
}

/** "▲ 12,5% vs prev. 30 days" / "▼ 4% …" / "no sales in the previous period". */
function Trend({ pct, days }: { pct: number | null; days: number }) {
  if (pct === null) return <span className="text-[var(--text-muted)]">no sales in the previous {days} days</span>;
  const up = pct > 0;
  const flat = pct === 0;
  return (
    <span className={flat ? 'text-[var(--text-muted)]' : up ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
      {flat ? '±' : up ? '▲' : '▼'} {fmtPct(Math.abs(pct) / 100)} <span className="text-[var(--text-muted)]">vs previous {days} days</span>
    </span>
  );
}

export function LocationDetail() {
  const { id = '' } = useParams();
  const [locations, setLocations] = useState<Location[]>([]);
  const [range, setRange] = useState<RangeKey>('30');
  const [report, setReport] = useState<LocationReport | null>(null);
  const [stock, setStock] = useState<LocationStockRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [toast, showToast] = useToast();

  const loc = locations.find(l => l.id === id) ?? null;
  const isEvent = loc?.kind === 'TEMPORARY';
  useEffect(() => { if (isEvent && (loc?.startDate || loc?.endDate)) setRange('event'); }, [isEvent, loc?.startDate, loc?.endDate]);

  const load = useCallback(() => {
    getLocations().then(setLocations).catch(e => setError(errMsg(e, 'Could not load locations.')));
    getLocationStock(id, { inStock: true, limit: 200 }).then(setStock).catch(() => setStock([]));
  }, [id]);
  useEffect(load, [load]);

  useEffect(() => {
    let alive = true; // ignore a slower answer for a period the user already left
    setReport(null);
    getLocationReport(id, rangeFor(range))
      .then(r => { if (alive) setReport(r); })
      .catch(e => { if (alive) setError(errMsg(e, 'Could not load the report.')); });
    return () => { alive = false; };
  }, [id, range, locations]);

  const days = report ? Math.max(1, Math.round((new Date(report.range.to).getTime() - new Date(report.range.from).getTime()) / DAY)) : 30;
  const chart = useMemo(() => {
    const d = report?.daily ?? [];
    const short = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    const series = [{ label: 'MF POS', values: d.map(x => x.posRevenue) }];
    if (d.some(x => x.dealposRevenue > 0)) series.push({ label: 'DealPOS', values: d.map(x => x.dealposRevenue) });
    return { labels: d.map(x => short(x.date)), series, every: Math.max(1, Math.ceil(d.length / 10)) };
  }, [report]);

  if (error) return <p className="text-[12px] text-[var(--danger)]">{error}</p>;
  if (!loc) return <p className="text-[12px] text-[var(--text-faint)]">Loading…</p>;

  const s = report?.sales;
  const consignment = loc.kind === 'CONSIGNMENT';
  const ranges: Array<[RangeKey, string]> = [
    ...(isEvent && (loc.startDate || loc.endDate) ? [['event', 'Event run'] as [RangeKey, string]] : []),
    ['7', '7 days'], ['30', '30 days'], ['90', '90 days'],
  ];

  return (
    <div>
      <Link to="/inventory?tab=locations" className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">← Locations</Link>
      <div className="flex items-start justify-between gap-3 mt-2 mb-4 flex-wrap">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.04em] leading-8 text-[var(--text-primary)]">{loc.name}</h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            {[KIND_LABEL[loc.kind], loc.address, isEvent ? formatDateRange(loc.startDate, loc.endDate) : null,
              consignment && loc.commissionPct ? `commission ${fmtPct((loc.commissionPct ?? 0) / 100)}` : null,
              !loc.active ? 'inactive' : null].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className={btnGhost} onClick={() => setRecording(true)}>Record sales</button>
          <button className={btnPrimary} onClick={() => setMoving(true)}>Move stock</button>
        </div>
      </div>
      {toast}

      <div className="flex gap-1.5 mb-3.5 flex-wrap" role="tablist" aria-label="Period">
        {ranges.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={range === k} onClick={() => setRange(k)}
            className={`text-[13px] font-medium px-3 py-1 min-h-[28px] rounded-full border transition-colors ${range === k ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'}`}>
            {label}
          </button>
        ))}
        {report && <span className="ml-auto self-center font-mono text-[11px] text-[var(--text-muted)]">{formatDateRange(report.range.from, report.range.to)}</span>}
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4 max-lg:grid-cols-2">
        <Stat label="Sales · excl. PPN" value={s ? fmtRpShort(s.revenue) : '—'}>
          {s ? <Trend pct={s.changePct} days={days} /> : 'Loading…'}
        </Stat>
        {consignment ? (
          <Stat label="Net after commission" value={s ? fmtRpShort(s.netIdr) : '—'}>
            {s ? `${fmtPct(s.commissionPct / 100)} commission · ${fmtRp(s.commissionIdr)}` : ''}
          </Stat>
        ) : (
          <Stat label="Orders" value={s ? fmtNum(s.orders) : '—'}>{s ? `avg ${fmtRp(s.avgOrder)}` : ''}</Stat>
        )}
        <Stat label="Units sold · sell-through" value={s ? fmtNum(s.units) : '—'}>
          {report ? `${fmtPct(report.sellThroughPct / 100)} of stock sold` : ''}
        </Stat>
        <Stat label="Stock here" value={report ? fmtNum(report.stock.units) : '—'}>
          {report ? `${fmtNum(report.stock.items)} titles · ${fmtRpShort(report.stock.valueIdr)} · in ${fmtNum(report.movement.unitsIn)} / out ${fmtNum(report.movement.unitsOut)}` : ''}
        </Stat>
      </div>

      <div className="mb-4">
        <Widget title="Sales trend" note={s ? `MF POS ${fmtRpShort(s.pos.revenue)}${s.dealpos.revenue ? ` · DealPOS ${fmtRpShort(s.dealpos.revenue)}` : ''}` : undefined}>
          <div className="p-4">
            {!report ? <p className="text-[12px] text-[var(--text-muted)]">Loading…</p>
              : report.daily.every(d => d.posRevenue + d.dealposRevenue === 0)
                ? <p className="text-[12px] text-[var(--text-muted)] py-6 text-center">No sales in this period yet.</p>
                : <BarChart labels={chart.labels} series={chart.series} labelEvery={chart.every} format={v => fmtRp(v)} />}
          </div>
        </Widget>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 max-lg:grid-cols-1">
        <Widget title="Top sellers" note={report ? `${fmtNum(report.topSellers.length)} titles` : undefined}>
          <table className="w-full border-collapse">
            <thead><tr>{['Release', 'Units', 'Sales'].map(h => <th key={h} className={`${thCls} ${h !== 'Release' ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
            <tbody>
              {!report && <EmptyRow cols={3}>Loading…</EmptyRow>}
              {report?.topSellers.length === 0 && <EmptyRow cols={3}>No MF POS sales here in this period.</EmptyRow>}
              {report?.topSellers.map(t => (
                <tr key={t.releaseId} className="border-b border-[var(--border-sub)]">
                  <td className={tdCls}><span className="text-[var(--text-primary)]">{t.artist}</span> <span className="text-[var(--text-muted)]">— {t.title}</span></td>
                  <td className={`${tdCls} font-mono text-right`}>{fmtNum(t.units)}</td>
                  <td className={`${tdCls} font-mono text-right`}>{fmtRp(t.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Widget>

        <Widget title="Stock here" note={stock ? `${fmtNum(stock.length)} titles` : undefined}>
          <div className="max-h-[360px] overflow-y-auto">
            <table className="w-full border-collapse">
              <thead><tr>{['Release', 'Cat#', 'Qty', 'Price'].map(h => <th key={h} className={`${thCls} ${h === 'Qty' || h === 'Price' ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
              <tbody>
                {!stock && <EmptyRow cols={4}>Loading…</EmptyRow>}
                {stock?.length === 0 && <EmptyRow cols={4}>Nothing here yet. Use Move stock to send items.</EmptyRow>}
                {stock?.map(r => (
                  <tr key={r.id} className="border-b border-[var(--border-sub)]">
                    <td className={tdCls}><Link to={`/inventory/${r.id}/edit`} className="text-[var(--text-primary)] hover:underline">{r.artist}</Link> <span className="text-[var(--text-muted)]">— {r.title}</span></td>
                    <td className={`${tdCls} font-mono text-[var(--text-muted)]`}>{r.catNumber ?? '—'}</td>
                    <td className={`${tdCls} font-mono text-right`}>{fmtNum(r.locationQty)}</td>
                    <td className={`${tdCls} font-mono text-right`}>{fmtRp(r.priceIdr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Widget>
      </div>

      <Widget title="Stock moves" note={report ? `last ${fmtNum(report.transfers.length)}` : undefined}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[640px]">
            <thead><tr>{['Date', 'Transfer', 'Direction', 'Items', 'Units', 'Note'].map(h => <th key={h} className={`${thCls} ${h === 'Units' ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
            <tbody>
              {!report && <EmptyRow cols={6}>Loading…</EmptyRow>}
              {report?.transfers.length === 0 && <EmptyRow cols={6}>No stock has moved in or out of {loc.name} yet.</EmptyRow>}
              {report?.transfers.map(t => {
                const incoming = t.to.id === id;
                const units = t.lines.reduce((n, l) => n + l.qty, 0);
                return (
                  <tr key={t.id} className="border-b border-[var(--border-sub)] align-top">
                    <td className={`${tdCls} whitespace-nowrap text-[var(--text-secondary)]`}>{new Date(t.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className={`${tdCls} font-mono`}>{t.number}</td>
                    <td className={tdCls}>{incoming ? <>In from <span className="text-[var(--text-primary)]">{t.from.name}</span></> : <>Out to <span className="text-[var(--text-primary)]">{t.to.name}</span></>}</td>
                    <td className={`${tdCls} text-[var(--text-secondary)]`}>{t.lines.slice(0, 3).map(l => `${l.artist} — ${l.title} ×${l.qty}`).join(', ')}{t.lines.length > 3 ? ` +${t.lines.length - 3} more` : ''}</td>
                    <td className={`${tdCls} font-mono text-right ${incoming ? 'text-[var(--success)]' : ''}`}>{incoming ? '+' : '−'}{fmtNum(units)}</td>
                    <td className={`${tdCls} text-[var(--text-muted)]`}>{t.note ?? ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Widget>

      {moving && (
        <MoveStockModal
          locations={locations}
          initialFrom={id}
          onClose={() => setMoving(false)}
          onDone={t => { setMoving(false); showToast('ok', `${t.number}: moved ${fmtNum(t.lines.reduce((n, l) => n + l.qty, 0))} units to ${t.to.name}.`); load(); }}
        />
      )}
      {recording && (
        <RecordSalesModal
          location={loc}
          onClose={() => setRecording(false)}
          onDone={() => { setRecording(false); showToast('ok', 'Sales recorded.'); load(); }}
        />
      )}
    </div>
  );
}

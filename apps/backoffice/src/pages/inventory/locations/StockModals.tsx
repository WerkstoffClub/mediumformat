import { useEffect, useMemo, useState } from 'react';
import {
  apiError, createTransfer, getLocationStock, recordLocationSales,
  type Location, type LocationRecord, type LocationStockRow, type StockTransfer,
} from '../../../api/locations';
import { fmtNum, fmtRp } from '../../../lib/idFormat';
import { btnGhost, btnPrimary } from '../../../components/ui/Drawer';
import { ModalShell } from '../release-edit/ModalShell';

const inputCls =
  'w-full bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[6px] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)] placeholder:text-[var(--text-muted)]';
const labelCls = 'block text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)] mb-1.5';
const qtyCls = 'w-[64px] bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[6px] px-2 py-1.5 text-[13px] font-mono text-right text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]';

function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

const clampQty = (raw: string, max: number) => Math.max(0, Math.min(max, Math.floor(Number(raw.replace(/[^0-9]/g, '')) || 0)));

/** Move stock directly from one location to another. */
export function MoveStockModal({ locations, initialFrom, initialTo, onClose, onDone }: {
  locations: Array<Location | LocationRecord>;
  initialFrom?: string;
  initialTo?: string;
  onClose: () => void;
  onDone: (t: StockTransfer) => void;
}) {
  const [from, setFrom] = useState(initialFrom ?? locations[0]?.id ?? '');
  const [to, setTo] = useState(initialTo ?? locations.find(l => l.id !== (initialFrom ?? locations[0]?.id) && l.active)?.id ?? '');
  const [q, setQ] = useState('');
  const query = useDebounced(q);
  const [results, setResults] = useState<LocationStockRow[] | null>(null);
  const [lines, setLines] = useState<Array<{ row: LocationStockRow; qty: number }>>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setLines([]); }, [from]);
  useEffect(() => {
    if (!from) return;
    let alive = true;
    setResults(null);
    getLocationStock(from, { q: query, inStock: true, limit: 30 })
      .then(r => { if (alive) setResults(r); })
      .catch(() => { if (alive) setResults([]); });
    return () => { alive = false; };
  }, [from, query]);

  const add = (row: LocationStockRow) => setLines(ls => ls.some(l => l.row.id === row.id) ? ls : [...ls, { row, qty: 1 }]);
  const units = lines.reduce((n, l) => n + l.qty, 0);
  const fromName = locations.find(l => l.id === from)?.name ?? '';
  const toName = locations.find(l => l.id === to)?.name ?? '';

  const submit = async () => {
    setError(null);
    if (!from || !to || from === to) { setError('Pick two different locations.'); return; }
    const payload = lines.filter(l => l.qty > 0).map(l => ({ releaseId: l.row.id, qty: l.qty }));
    if (payload.length === 0) { setError('Add at least one item with a quantity.'); return; }
    setBusy(true);
    try {
      onDone(await createTransfer({ fromLocationId: from, toLocationId: to, lines: payload, note: note.trim() || undefined }));
    } catch (e) {
      setError(apiError(e, 'The stock could not be moved.'));
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title="Move stock"
      subtitle="Moves at once: units leave the source and arrive at the destination."
      onClose={onClose}
      widthClass="max-w-[640px]"
      footer={
        <>
          <span className="mr-auto text-[12px] text-[var(--text-muted)]">{fmtNum(units)} unit{units === 1 ? '' : 's'}{fromName && toName ? ` · ${fromName} → ${toName}` : ''}</span>
          <button type="button" className={btnGhost} onClick={onClose}>Cancel</button>
          <button type="button" className={btnPrimary} onClick={submit} disabled={busy || units === 0}>{busy ? 'Moving…' : `Move ${fmtNum(units)} unit${units === 1 ? '' : 's'}`}</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 mb-3.5">
        <label>
          <span className={labelCls}>From</span>
          <select className={inputCls} value={from} onChange={e => setFrom(e.target.value)}>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <label>
          <span className={labelCls}>To</span>
          <select className={inputCls} value={to} onChange={e => setTo(e.target.value)}>
            <option value="">Choose…</option>
            {locations.filter(l => l.id !== from && l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
      </div>

      <label className="block mb-2">
        <span className={labelCls}>Add items held at {fromName || 'the source'}</span>
        <input className={inputCls} placeholder="Search or scan: artist, title, cat# or barcode…" value={q} onChange={e => setQ(e.target.value)} autoFocus />
      </label>
      <div className="border border-[var(--border)] rounded-[6px] max-h-[180px] overflow-y-auto mb-3.5">
        {results === null && <p className="px-3 py-3 text-[12px] text-[var(--text-muted)]">Loading…</p>}
        {results?.length === 0 && <p className="px-3 py-3 text-[12px] text-[var(--text-muted)]">Nothing in stock here{query ? ' for that search' : ''}.</p>}
        {results?.map(r => {
          const added = lines.some(l => l.row.id === r.id);
          return (
            <button key={r.id} type="button" onClick={() => add(r)} disabled={added}
              className="w-full flex items-center gap-3 px-3 py-2 text-left border-b border-[var(--border-sub)] last:border-b-0 hover:bg-[var(--bg-hover)] disabled:opacity-50">
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] text-[var(--text-primary)] truncate">{r.artist} — {r.title}</span>
                <span className="block text-[11px] text-[var(--text-muted)] font-mono truncate">{[r.catNumber, fmtRp(r.priceIdr)].filter(Boolean).join(' · ')}</span>
              </span>
              <span className="font-mono text-[12px] text-[var(--text-secondary)] whitespace-nowrap">{fmtNum(r.locationQty)} here</span>
              <span className="text-[12px] font-medium text-[var(--text-primary)] w-10 text-right">{added ? 'Added' : 'Add'}</span>
            </button>
          );
        })}
      </div>

      {lines.length > 0 && (
        <div className="mb-3.5">
          <p className={labelCls}>Moving</p>
          {lines.map((l, i) => (
            <div key={l.row.id} className="flex items-center gap-3 py-1.5 border-b border-[var(--border-sub)] last:border-b-0">
              <span className="min-w-0 flex-1 text-[12.5px] text-[var(--text-primary)] truncate">{l.row.artist} — {l.row.title}</span>
              <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">of {fmtNum(l.row.locationQty)}</span>
              <input aria-label={`Quantity of ${l.row.title}`} className={qtyCls} inputMode="numeric" value={l.qty || ''}
                onChange={e => { const qty = clampQty(e.target.value, l.row.locationQty); setLines(ls => ls.map((x, j) => j === i ? { ...x, qty } : x)); }} />
              <button type="button" aria-label="Remove" onClick={() => setLines(ls => ls.filter((_, j) => j !== i))} className="text-[var(--text-muted)] hover:text-[var(--danger)] text-[16px] leading-none px-1">×</button>
            </div>
          ))}
        </div>
      )}

      <label className="block">
        <span className={labelCls}>Note (optional)</span>
        <input className={inputCls} placeholder="e.g. Restock for Saturday's market" value={note} onChange={e => setNote(e.target.value)} maxLength={500} />
      </label>
      {error && <p role="alert" className="mt-3 text-[12px] text-[var(--danger)]">{error}</p>}
    </ModalShell>
  );
}

/** Record what a consignment shop or a till-less event sold, item by item. */
export function RecordSalesModal({ location, onClose, onDone }: {
  location: LocationRecord;
  onClose: () => void;
  onDone: () => void;
}) {
  const [rows, setRows] = useState<LocationStockRow[] | null>(null);
  const [sold, setSold] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState('');
  const [date, setDate] = useState(() => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLocationStock(location.id, { inStock: true, limit: 200 }).then(setRows).catch(() => setRows([]));
  }, [location.id]);

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return (rows ?? []).filter(r => !f || `${r.artist} ${r.title} ${r.catNumber ?? ''} ${r.barcode ?? ''}`.toLowerCase().includes(f));
  }, [rows, filter]);
  const lines = (rows ?? []).filter(r => (sold[r.id] ?? 0) > 0).map(r => ({ row: r, qty: sold[r.id] }));
  const units = lines.reduce((n, l) => n + l.qty, 0);
  const gross = lines.reduce((n, l) => n + l.qty * l.row.priceIdr, 0);
  const pct = location.kind === 'CONSIGNMENT' ? location.commissionPct ?? 0 : 0;
  const commission = Math.round(gross * (pct / 100));

  const submit = async () => {
    if (lines.length === 0) { setError('Enter how many of each item sold.'); return; }
    setBusy(true);
    setError(null);
    try {
      const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
      await recordLocationSales({
        locationId: location.id,
        lines: lines.map(l => ({ releaseId: l.row.id, qty: l.qty })),
        soldAt: date && date !== today ? new Date(`${date}T12:00:00+07:00`).toISOString() : undefined,
      });
      onDone();
    } catch (e) {
      setError(apiError(e, 'The sales could not be recorded.'));
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title={`Record sales · ${location.name}`}
      subtitle="Items sold there come off this location's stock. Retail price, no PPN added."
      onClose={onClose}
      widthClass="max-w-[640px]"
      footer={
        <>
          <span className="mr-auto text-[12px] text-[var(--text-muted)] font-mono">
            {fmtNum(units)} sold · {fmtRp(gross)}{pct > 0 ? ` · commission ${fmtRp(commission)} · net ${fmtRp(gross - commission)}` : ''}
          </span>
          <button type="button" className={btnGhost} onClick={onClose}>Cancel</button>
          <button type="button" className={btnPrimary} onClick={submit} disabled={busy || units === 0}>{busy ? 'Saving…' : 'Record sales'}</button>
        </>
      }
    >
      <div className="grid grid-cols-[1fr_160px] gap-3 mb-3">
        <label>
          <span className={labelCls}>Find</span>
          <input className={inputCls} placeholder="Artist, title, cat#…" value={filter} onChange={e => setFilter(e.target.value)} />
        </label>
        <label>
          <span className={labelCls}>Sold on</span>
          <input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} />
        </label>
      </div>
      <div className="border border-[var(--border)] rounded-[6px] max-h-[320px] overflow-y-auto">
        {rows === null && <p className="px-3 py-3 text-[12px] text-[var(--text-muted)]">Loading…</p>}
        {rows?.length === 0 && <p className="px-3 py-3 text-[12px] text-[var(--text-muted)]">No stock at {location.name}. Move stock here first.</p>}
        {shown.map(r => (
          <div key={r.id} className="flex items-center gap-3 px-3 py-2 border-b border-[var(--border-sub)] last:border-b-0">
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] text-[var(--text-primary)] truncate">{r.artist} — {r.title}</span>
              <span className="block text-[11px] text-[var(--text-muted)] font-mono">{fmtRp(r.priceIdr)} · {fmtNum(r.locationQty)} here</span>
            </span>
            <input aria-label={`Sold of ${r.title}`} className={qtyCls} inputMode="numeric" placeholder="0" value={sold[r.id] || ''}
              onChange={e => setSold(s => ({ ...s, [r.id]: clampQty(e.target.value, r.locationQty) }))} />
          </div>
        ))}
      </div>
      {error && <p role="alert" className="mt-3 text-[12px] text-[var(--danger)]">{error}</p>}
    </ModalShell>
  );
}

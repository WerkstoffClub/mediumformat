import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  allocateConsolidation, attachOrder, detachOrder, getConsolidation, updateConsolidation,
  type AttachedOrder, type ConsolidationDetail as ConsolidationDetailData,
} from '../../api/consolidations';
import { getImports, type ImportOrderRow } from '../../api/imports';
import { fmtDate, fmtIdr } from '../../api/ops';
import { Panel, StatusPill, tdCls, thCls } from '../../components/ui/Page';
import { IMPORT_STATUS_LABEL } from '../imports/shared';
import { apiErrorMessage, CONSOLIDATION_STATUS_LABEL, Field, inputCls } from './shared';

/** Weight × qty for one attached line, in kg — mirrors the server's
 *  allocateByWeight input (see apps/api ConsolidationsService.allocate). */
const lineWeightKg = (line: { weightKg: string | number; qty: number }): number =>
  Number(line.weightKg) * line.qty;

function ForwarderPanel({
  detail, onSaved,
}: { detail: ConsolidationDetailData; onSaved: (d: ConsolidationDetailData) => void }) {
  const [forwarderName, setForwarderName] = useState(detail.forwarderName);
  const [forwarderInvoiceIdr, setForwarderInvoiceIdr] = useState(String(Number(detail.forwarderInvoiceIdr ?? 0)));
  const [trackingRaw, setTrackingRaw] = useState(detail.trackingRaw ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const onSave = async () => {
    if (!forwarderName.trim()) { setError('Forwarder name is required.'); return; }
    setError(null);
    setSaving(true);
    try {
      const updated = await updateConsolidation(detail.id, {
        forwarderName: forwarderName.trim(),
        forwarderInvoiceIdr: Number(forwarderInvoiceIdr) || 0,
        trackingRaw: trackingRaw.trim() || undefined,
      });
      onSaved(updated);
      setSavedAt(Date.now());
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="Forwarder">
      <div className="p-3.5 space-y-3">
        <Field label="Forwarder name" required>
          <input className={inputCls} value={forwarderName} onChange={e => setForwarderName(e.target.value)} />
        </Field>
        <Field label="Forwarder invoice (IDR)" required>
          <input
            type="number"
            min={0}
            className={`${inputCls} font-mono`}
            value={forwarderInvoiceIdr}
            onChange={e => setForwarderInvoiceIdr(e.target.value)}
          />
        </Field>
        <Field label="Tracking">
          <textarea
            className={`${inputCls} min-h-[64px] resize-y`}
            value={trackingRaw}
            onChange={e => setTrackingRaw(e.target.value)}
            placeholder="Tracking numbers, one per line or comma-separated"
          />
        </Field>

        {error && <p className="text-[11px] text-[var(--danger)]">{error}</p>}
        <div className="flex items-center gap-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="text-[12px] px-3 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {savedAt && !saving && <span className="text-[11px] text-[var(--success)]">Saved.</span>}
        </div>

        <div className="border-t border-[var(--border-sub)] pt-3 mt-1 space-y-1.5 text-[12px]">
          <div className="flex justify-between text-[var(--text-secondary)]"><span>Orders</span><span className="font-mono">{detail.totals.orderCount}</span></div>
          <div className="flex justify-between text-[var(--text-secondary)]"><span>Units</span><span className="font-mono">{detail.totals.totalUnits}</span></div>
          <div className="flex justify-between text-[var(--text-secondary)]"><span>Total weight</span><span className="font-mono">{detail.totals.totalWeightKg.toFixed(2)} kg</span></div>
        </div>
      </div>
    </Panel>
  );
}

function AttachedOrdersPanel({
  detail, onChanged,
}: { detail: ConsolidationDetailData; onChanged: (d: ConsolidationDetailData) => void }) {
  const [candidates, setCandidates] = useState<ImportOrderRow[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [detachingId, setDetachingId] = useState<string | null>(null);
  const [detachError, setDetachError] = useState<string | null>(null);

  const attachedIds = useMemo(() => new Set(detail.orders.map(o => o.id)), [detail.orders]);

  const loadCandidates = useCallback(() => {
    setLoadingCandidates(true);
    getImports({ origin: 'INTERNATIONAL', limit: 200 })
      .then(r => setCandidates(r.items.filter(o => !attachedIds.has(o.id))))
      .catch(() => setCandidates([]))
      .finally(() => setLoadingCandidates(false));
  }, [attachedIds]);

  useEffect(loadCandidates, [loadCandidates]);

  const onAttach = async () => {
    if (!selectedId) return;
    setAttachError(null);
    setAttaching(true);
    try {
      const updated = await attachOrder(detail.id, selectedId);
      onChanged(updated);
      setSelectedId('');
    } catch (err) {
      setAttachError(apiErrorMessage(err, 'Could not attach this order.'));
    } finally {
      setAttaching(false);
    }
  };

  const onDetach = async (order: AttachedOrder) => {
    if (!window.confirm(`Remove ${order.number} from this consolidation? Its freight allocation will be reset.`)) return;
    setDetachError(null);
    setDetachingId(order.id);
    try {
      const updated = await detachOrder(detail.id, order.id);
      onChanged(updated);
    } catch (err) {
      setDetachError(apiErrorMessage(err, 'Could not remove this order.'));
    } finally {
      setDetachingId(null);
    }
  };

  return (
    <Panel title="Attached orders" note={String(detail.orders.length)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[var(--bg-overlay)]">
            {['Order #', 'Vendor', 'Currency', 'Status', 'Lines', 'Allocated freight', ''].map(h => (
              <th key={h} className={thCls}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {detail.orders.length === 0 && (
            <tr><td colSpan={7} className={`${tdCls} text-center text-[var(--text-faint)]`}>No orders attached yet.</td></tr>
          )}
          {detail.orders.map(order => {
            const allocatedTotal = order.lines.reduce((s, l) => s + Number(l.allocatedForwarderIdr || 0), 0);
            return (
              <tr key={order.id} className="border-b border-[var(--border-sub)]">
                <td className={`${tdCls} font-mono font-medium text-[var(--text-primary)] whitespace-nowrap`}>
                  <Link to={`/imports/${order.id}`} className="hover:underline">{order.number}</Link>
                </td>
                <td className={`${tdCls} max-w-[200px] truncate`}>{order.vendorName || <span className="text-[var(--text-faint)]">—</span>}</td>
                <td className={`${tdCls} font-mono text-[var(--text-muted)]`}>{order.currency}</td>
                <td className={tdCls}><StatusPill value={IMPORT_STATUS_LABEL[order.status]} /></td>
                <td className={`${tdCls} font-mono text-right`}>{order.lines.length}</td>
                <td className={`${tdCls} font-mono text-right whitespace-nowrap text-[var(--text-primary)]`}>{fmtIdr(allocatedTotal)}</td>
                <td className={`${tdCls} text-right whitespace-nowrap`}>
                  <button
                    onClick={() => onDetach(order)}
                    disabled={detachingId === order.id}
                    className="text-[11px] px-2.5 py-1 rounded-[5px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--danger)] hover:border-[var(--danger)] transition-colors disabled:opacity-50"
                  >
                    {detachingId === order.id ? 'Removing…' : 'Remove'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {detachError && <p className="px-3.5 py-2 text-[11px] text-[var(--danger)]">{detachError}</p>}

      <div className="border-t border-[var(--border-sub)] p-3.5 flex items-center gap-2 flex-wrap">
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          disabled={loadingCandidates || candidates.length === 0}
          className="flex-1 min-w-[200px] bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[11.5px] text-[var(--text-primary)] outline-none disabled:opacity-50"
        >
          <option value="">
            {loadingCandidates ? 'Loading orders…' : candidates.length === 0 ? 'No unattached international orders' : 'Select an order to add…'}
          </option>
          {candidates.map(o => (
            <option key={o.id} value={o.id}>{o.number} — {o.vendorName || 'Unnamed vendor'}</option>
          ))}
        </select>
        <button
          onClick={onAttach}
          disabled={!selectedId || attaching}
          className="text-[12px] px-3 py-1.5 rounded-[6px] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {attaching ? 'Adding…' : 'Add order'}
        </button>
      </div>
      {attachError && <p className="px-3.5 pb-3 text-[11px] text-[var(--danger)]">{attachError}</p>}
    </Panel>
  );
}

function AllocationPanel({ detail }: { detail: ConsolidationDetailData }) {
  const rows = detail.orders.flatMap(order => order.lines.map(line => ({ order, line })));

  return (
    <Panel title="Freight allocation by line" note={`${rows.length} line${rows.length === 1 ? '' : 's'}`}>
      {rows.length === 0 ? (
        <p className="px-3.5 py-4 text-[11px] text-[var(--text-faint)]">No lines yet — attach an order to see its lines here.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              {['Order #', 'Item', 'Weight × qty', 'Allocated freight', 'Landed cost'].map(h => (
                <th key={h} className={thCls}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ order, line }) => (
              <tr key={line.id} className="border-b border-[var(--border-sub)]">
                <td className={`${tdCls} font-mono text-[var(--text-muted)] whitespace-nowrap`}>{order.number}</td>
                <td className={tdCls}>
                  <span className="block text-[var(--text-primary)] truncate max-w-[220px]">{line.artist} — {line.title}</span>
                </td>
                <td className={`${tdCls} font-mono text-right whitespace-nowrap text-[var(--text-muted)]`}>
                  {Number(line.weightKg).toFixed(2)} × {line.qty} = {lineWeightKg(line).toFixed(2)} kg
                </td>
                <td className={`${tdCls} font-mono text-right whitespace-nowrap text-[var(--text-primary)]`}>{fmtIdr(line.allocatedForwarderIdr)}</td>
                <td className={`${tdCls} font-mono text-right whitespace-nowrap text-[var(--text-muted)]`}>
                  {Number(line.landedCostIdr) > 0 ? fmtIdr(line.landedCostIdr) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

export function ConsolidationDetail() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<ConsolidationDetailData | null>(null);
  const [error, setError] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [allocateError, setAllocateError] = useState<string | null>(null);
  const [allocateMessage, setAllocateMessage] = useState<string | null>(null);

  const activeIdRef = useRef<string | undefined>(id);
  activeIdRef.current = id;

  const load = useCallback(() => {
    if (!id) return;
    const requestedId = id;
    getConsolidation(id)
      .then(d => { if (activeIdRef.current === requestedId) setDetail(d); })
      .catch(() => { if (activeIdRef.current === requestedId) setError(true); });
  }, [id]);

  useEffect(load, [load]);

  const totalWeightKg = detail?.orders.reduce((s, o) => s + o.lines.reduce((ls, l) => ls + lineWeightKg(l), 0), 0) ?? 0;
  const canAllocate = !!detail && detail.orders.length > 0 && Number(detail.forwarderInvoiceIdr) > 0;

  const onAllocate = async () => {
    if (!id || !canAllocate) return;
    setAllocateError(null);
    setAllocateMessage(null);
    setAllocating(true);
    try {
      const result = await allocateConsolidation(id);
      setDetail(result);
      setAllocateMessage(
        `Allocated ${fmtIdr(result.allocation.totalFreightIdr)} across ${result.allocation.lineCount} line${result.allocation.lineCount === 1 ? '' : 's'} — orders re-priced`,
      );
    } catch (err) {
      setAllocateError(apiErrorMessage(err, 'Could not allocate freight. Try again.'));
    } finally {
      setAllocating(false);
    }
  };

  if (error) return <p className="text-[12px] text-[var(--danger)]">Consolidation not found.</p>;
  if (!detail) return <p className="text-[12px] text-[var(--text-faint)]">Loading…</p>;

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mb-1.5">
            <Link to="/purchase-orders?tab=consolidations" className="hover:text-[var(--text-primary)]">Consolidations</Link>
            <span className="text-[var(--text-faint)]">/</span>
            <span className="font-mono text-[var(--text-secondary)]">{detail.number}</span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[24px] font-semibold tracking-[-0.04em] leading-8 text-[var(--text-primary)] font-mono">{detail.number}</h1>
            <StatusPill value={CONSOLIDATION_STATUS_LABEL[detail.status]} />
          </div>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">
            {detail.forwarderName} · {fmtDate(detail.createdAt)} · {totalWeightKg.toFixed(2)} kg total
          </p>
        </div>
        <div className="flex flex-col items-end gap-2.5">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Forwarder invoice</p>
            <p className="font-mono text-[24px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] leading-none mt-1.5">
              {fmtIdr(detail.forwarderInvoiceIdr)}
            </p>
          </div>
          <button
            onClick={onAllocate}
            disabled={!canAllocate || allocating}
            title={!canAllocate ? 'Attach at least one order and set a forwarder invoice above 0 before allocating.' : undefined}
            className="flex items-center gap-1.5 px-3 py-[7px] rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M3 3v18h18" /><path d="M7 15l4-5 3 3 5-7" /></svg>
            {allocating ? 'Allocating…' : 'Allocate freight'}
          </button>
          {!canAllocate && (
            <p className="text-[11px] text-[var(--text-faint)] max-w-[260px] text-right">
              Attach at least one order and set the forwarder invoice above.
            </p>
          )}
          {allocateError && <p className="text-[11px] text-[var(--danger)] max-w-[260px] text-right">{allocateError}</p>}
          {allocateMessage && <p className="text-[11px] text-[var(--success)] max-w-[280px] text-right">{allocateMessage}</p>}
        </div>
      </div>

      <div className="grid grid-cols-[1.6fr_1fr] gap-4 max-md:grid-cols-1 items-start">
        <div className="space-y-4">
          <AttachedOrdersPanel detail={detail} onChanged={setDetail} />
          <AllocationPanel detail={detail} />
        </div>

        <div className="space-y-4">
          <ForwarderPanel detail={detail} onSaved={setDetail} />
        </div>
      </div>
    </div>
  );
}

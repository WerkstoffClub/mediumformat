import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fmtIdr } from '../../api/ops';
import {
  cancelPo, createPo, getPo, receivePo, updatePo,
  type PoLine, type PoStatus, type PurchaseOrder,
} from '../../api/purchaseOrders';
import { StatusPill } from '../../components/ui/Page';
import { LineEditor } from './LineEditor';

const ANIM_MS = 220;

const STATUS_LABEL: Record<PoStatus, string> = {
  DRAFT: 'Draft', SENT: 'Sent', PARTIAL: 'Partial', RECEIVED: 'Received', CANCELLED: 'Cancelled',
};

interface Props {
  /** null = new (unsaved) draft */
  poId: string | null;
  onClose: () => void;
  onSaved: () => void;
  onToast: (kind: 'ok' | 'err', text: string) => void;
}

/** mf-panel-hdr recipe (DESIGN.md §v2.1): solid accent bar with accent-text.
 *  Inverts per theme via CSS vars — black bar/white text in light, inverted in dark. */
function PanelHdr({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-text)] text-[11px] font-semibold uppercase tracking-[0.08em]">
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-4 mb-4 border border-[var(--border)] rounded-[8px] overflow-hidden">
      <PanelHdr>{title}</PanelHdr>
      <div className="p-4 space-y-3 bg-[var(--bg-surface)]">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.05em] text-[var(--text-muted)] mb-1">{label}</span>
      {children}
    </label>
  );
}

const dateInputValue = (v: string | null | undefined) => (v ? v.slice(0, 10) : '');

export function PurchaseOrderDrawer({ poId, onClose, onSaved, onToast }: Props) {
  const isNew = poId === null;
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [supplierName, setSupplierName] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [orderedAt, setOrderedAt] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [etaAt, setEtaAt] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<PoLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  // Slide-out close: latch onClose so ESC/backdrop use the current callback.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const close = useCallback(() => {
    setOpen(false);
    setTimeout(() => onCloseRef.current(), ANIM_MS);
  }, []);

  useEffect(() => {
    const t = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // Load the PO into local form state (ignore stale response on id change).
  useEffect(() => {
    if (isNew) return;
    let active = true;
    setError(null);
    getPo(poId as string)
      .then(d => {
        if (!active) return;
        setPo(d);
        setSupplierName(d.supplierName ?? '');
        setSupplierId(d.supplierId ?? '');
        setOrderedAt(dateInputValue(d.orderedAt));
        setEtaAt(dateInputValue(d.etaAt));
        setNotes(d.notes ?? '');
        setLines(d.lines);
      })
      .catch(() => { if (active) setError('Could not load this PO.'); });
    return () => { active = false; };
  }, [poId, isNew]);

  const status: PoStatus = po?.status ?? 'DRAFT';
  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + Number(l.qtyOrdered || 0) * Number(l.unitCostIdr || 0), 0),
    [lines],
  );
  const total = subtotal;

  const validate = (): string | null => {
    if (!supplierName.trim()) return 'Supplier name is required.';
    if (lines.length === 0) return 'Add at least one line.';
    if (lines.some(l => !l.description.trim())) return 'Every line needs a description.';
    return null;
  };

  const linesForCreate = () =>
    lines.map(l => ({
      description: l.description.trim(),
      qtyOrdered: Number(l.qtyOrdered) || 0,
      unitCostIdr: Number(l.unitCostIdr) || 0,
      releaseId: l.releaseId ?? undefined,
    }));

  const saveNew = async (nextStatus: PoStatus) => {
    const err = validate();
    if (err) { onToast('err', err); return; }
    setSaving(true);
    try {
      const created = await createPo({
        supplierName: supplierName.trim(),
        supplierId: supplierId.trim() || undefined,
        orderedAt: orderedAt || undefined,
        etaAt: etaAt || undefined,
        notes: notes.trim() || undefined,
        lines: linesForCreate(),
      });
      if (nextStatus !== 'DRAFT') {
        await updatePo(created.id, { status: nextStatus });
      }
      onToast('ok', nextStatus === 'SENT' ? 'PO sent to supplier.' : 'Draft PO saved.');
      onSaved();
      close();
    } catch {
      onToast('err', 'Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveExisting = async (nextStatus?: PoStatus) => {
    if (!po) return;
    const err = validate();
    if (err) { onToast('err', err); return; }
    setSaving(true);
    try {
      // Header fields always. Lines only while still DRAFT — once a PO is
      // sent, editing the lines is a receiving job, not a rewrite.
      const body: Partial<PurchaseOrder> = {
        supplierName: supplierName.trim(),
        supplierId: supplierId.trim() || null,
        orderedAt: orderedAt || null,
        etaAt: etaAt || null,
        notes: notes.trim() || null,
      };
      if (po.status === 'DRAFT') {
        // Backend accepts a lightweight line shape on update while draft.
        (body as unknown as { lines: unknown }).lines = linesForCreate();
      }
      if (nextStatus) body.status = nextStatus;
      await updatePo(po.id, body);
      onToast('ok', nextStatus === 'SENT' ? 'PO sent to supplier.' : 'Changes saved.');
      onSaved();
      close();
    } catch {
      onToast('err', 'Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const doCancel = async () => {
    if (!po) return;
    if (!confirm(`Cancel PO ${po.poNumber}? This can't be undone.`)) return;
    try {
      await cancelPo(po.id);
      onToast('ok', 'PO cancelled.');
      onSaved();
      close();
    } catch {
      onToast('err', 'Cancel failed.');
    }
  };

  const doReceive = async (rows: Array<{ id: string; qtyReceived: number }>) => {
    if (!po) return;
    try {
      await receivePo(po.id, rows);
      onToast('ok', 'Receipt recorded.');
      onSaved();
      close();
    } catch {
      onToast('err', 'Receive failed.');
    }
  };

  const canReceive = status === 'SENT' || status === 'PARTIAL';
  const canCancel = po && status !== 'CANCELLED' && status !== 'RECEIVED';

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={close}
      />
      <aside
        role="dialog"
        aria-label={po ? `Purchase order ${po.poNumber}` : 'New purchase order'}
        className={`absolute right-0 top-0 h-full w-full max-w-[560px] bg-[var(--bg-base)] border-l border-[var(--border)] shadow-[0_8px_24px_rgba(0,0,0,.6)] flex flex-col transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* header */}
        <div className="flex items-start gap-3 px-5 py-3.5 border-b border-[var(--border)] flex-shrink-0 bg-[var(--bg-surface)]">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {isNew ? 'New purchase order' : 'Purchase order'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <h2 className="font-mono text-[16px] font-semibold text-[var(--text-primary)]">
                {po?.poNumber ?? 'NEW'}
              </h2>
              <StatusPill value={STATUS_LABEL[status]} />
            </div>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto pt-4">
          {error && <p className="mx-4 mb-4 text-[12px] text-[var(--danger)]">{error}</p>}
          {!error && !isNew && !po && <p className="mx-4 mb-4 text-[12px] text-[var(--text-faint)]">Loading…</p>}
          {(isNew || po) && !error && (
            <>
              {po?.sourceBillId && (
                <div className="mx-4 mb-4 p-3 rounded-[6px] border border-[var(--warning)] bg-[var(--warning-t)]">
                  <p className="text-[12px] font-semibold text-[var(--warning)] mb-0.5">Sourced from DealPOS bill.</p>
                  <p className="text-[11.5px] text-[var(--text-secondary)]">
                    Once you move past DRAFT, DealPOS re-syncs will not overwrite this PO. Refresh from DealPOS manually if needed.
                  </p>
                </div>
              )}

              <Section title="Supplier">
                <Field label="Supplier name">
                  <input
                    type="text"
                    value={supplierName}
                    onChange={e => setSupplierName(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
                  />
                </Field>
                <Field label="Supplier ID (optional)">
                  <input
                    type="text"
                    value={supplierId}
                    onChange={e => setSupplierId(e.target.value)}
                    placeholder="e.g. dealpos supplier id"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)] font-mono placeholder:text-[var(--text-faint)]"
                  />
                </Field>
              </Section>

              <Section title="Dates &amp; notes">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Ordered">
                    <input
                      type="date"
                      value={orderedAt}
                      onChange={e => setOrderedAt(e.target.value)}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
                    />
                  </Field>
                  <Field label="ETA">
                    <input
                      type="date"
                      value={etaAt}
                      onChange={e => setEtaAt(e.target.value)}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
                    />
                  </Field>
                </div>
                <Field label="Notes">
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)] resize-none"
                  />
                </Field>
              </Section>

              <Section title="Lines">
                {status !== 'DRAFT' && (
                  <p className="text-[11px] text-[var(--text-muted)] -mt-1">
                    Lines are locked after DRAFT. Use “Mark received” to record receipts.
                  </p>
                )}
                <div className={status !== 'DRAFT' ? 'pointer-events-none opacity-60' : ''}>
                  <LineEditor value={lines} onChange={setLines} />
                </div>
              </Section>

              <Section title="Totals">
                <div className="space-y-1.5 text-[12px]">
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Subtotal</span>
                    <span className="font-mono">{fmtIdr(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Tax</span>
                    <span className="font-mono">{fmtIdr(0)}</span>
                  </div>
                  <div className="flex justify-between text-[14px] font-semibold text-[var(--text-primary)] pt-1.5 border-t border-[var(--border-sub)]">
                    <span>Total</span>
                    <span className="font-mono">{fmtIdr(total)}</span>
                  </div>
                </div>
              </Section>
            </>
          )}
        </div>

        {/* sticky footer */}
        {(isNew || po) && !error && (
          <div className="border-t border-[var(--border)] px-4 py-3 flex items-center gap-2 flex-shrink-0 bg-[var(--bg-surface)] flex-wrap">
            {canCancel && (
              <button
                type="button"
                onClick={doCancel}
                disabled={saving}
                className="text-[12px] px-3 py-2 rounded-[6px] border border-[var(--border)] text-[var(--danger)] hover:border-[var(--danger)] disabled:opacity-50 transition-colors"
              >
                Cancel PO
              </button>
            )}
            <div className="flex-1" />
            {isNew && (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveNew('DRAFT')}
                  className="text-[12px] px-3 py-2 rounded-[6px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] disabled:opacity-50 transition-colors"
                >
                  Save draft
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveNew('SENT')}
                  className="text-[12px] px-3 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] font-semibold disabled:opacity-50"
                >
                  Send
                </button>
              </>
            )}
            {!isNew && po && status === 'DRAFT' && (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveExisting()}
                  className="text-[12px] px-3 py-2 rounded-[6px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] disabled:opacity-50 transition-colors"
                >
                  Save draft
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveExisting('SENT')}
                  className="text-[12px] px-3 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] font-semibold disabled:opacity-50"
                >
                  Send
                </button>
              </>
            )}
            {!isNew && po && canReceive && (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveExisting()}
                  className="text-[12px] px-3 py-2 rounded-[6px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] disabled:opacity-50 transition-colors"
                >
                  Save changes
                </button>
                <button
                  type="button"
                  onClick={() => setReceiveOpen(true)}
                  className="text-[12px] px-3 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] font-semibold"
                >
                  Mark received
                </button>
              </>
            )}
          </div>
        )}
      </aside>

      {receiveOpen && po && (
        <ReceiveModal
          lines={po.lines}
          onClose={() => setReceiveOpen(false)}
          onConfirm={doReceive}
        />
      )}
    </div>
  );
}

/** Per-line receipt entry. Only fully-persisted lines (with an id) can be
 *  received against the backend endpoint. */
function ReceiveModal({
  lines, onClose, onConfirm,
}: {
  lines: PoLine[];
  onClose: () => void;
  onConfirm: (rows: Array<{ id: string; qtyReceived: number }>) => Promise<void> | void;
}) {
  const receivable = lines.filter((l): l is PoLine & { id: string } => Boolean(l.id));
  const [values, setValues] = useState<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    for (const l of receivable) out[l.id] = Math.max(0, l.qtyOrdered - l.qtyReceived);
    return out;
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const payload = receivable.map(l => ({
      id: l.id,
      qtyReceived: Math.max(0, (l.qtyReceived || 0) + (values[l.id] ?? 0)),
    }));
    setSubmitting(true);
    try {
      await onConfirm(payload);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Mark received"
        className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] w-full max-w-[440px] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Mark received</h3>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Enter the qty received on this shipment. Cumulative received qty is shown per line.
          </p>
        </div>
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {receivable.length === 0 && (
            <p className="text-[11px] text-[var(--text-faint)] text-center py-3">No receivable lines.</p>
          )}
          {receivable.map(l => {
            const remaining = Math.max(0, l.qtyOrdered - l.qtyReceived);
            return (
              <div key={l.id} className="flex items-center gap-3 text-[12px]">
                <span className="flex-1 min-w-0 truncate text-[var(--text-primary)]">{l.description}</span>
                <span className="font-mono text-[10px] text-[var(--text-faint)] whitespace-nowrap">
                  {l.qtyReceived}/{l.qtyOrdered}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={remaining}
                  value={values[l.id] ?? 0}
                  onChange={e => setValues(v => ({
                    ...v,
                    [l.id]: Math.max(0, Math.min(remaining, Number(e.target.value))),
                  }))}
                  className="w-16 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1 text-right font-mono text-[12px] outline-none focus:border-[var(--text-muted)]"
                />
              </div>
            );
          })}
        </div>
        <div className="px-4 py-3 border-t border-[var(--border)] flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] px-3 py-2 rounded-[6px] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Close
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={submit}
            disabled={submitting || receivable.length === 0}
            className="text-[12px] px-3 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] font-semibold disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Confirm receipt'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fmtDate, fmtIdr } from '../../api/ops';
import {
  getImport, IMPORT_STATUS_STEPS, uploadAttachment,
  type ImportAttachmentKind, type ImportOrderDetail,
} from '../../api/imports';
import { Panel, StatusPill, tdCls, thCls } from '../../components/ui/Page';
import { fmtFormat, fmtNative, IMPORT_STATUS_LABEL, ORIGIN_LABEL, PAYMENT_METHOD_LABEL } from './shared';

const REIMBURSEMENT_LABEL: Record<string, string> = {
  NOT_REQUIRED: 'Not required', PENDING: 'Pending', REIMBURSED: 'Reimbursed',
};

const ATTACHMENT_KIND_LABEL: Record<ImportAttachmentKind, string> = {
  VENDOR_INVOICE: 'Vendor invoice',
  FORWARDER_INVOICE: 'Forwarder invoice',
  PAYMENT_PROOF: 'Payment proof',
  REIMBURSEMENT_PROOF: 'Reimbursement proof',
};

const fmtStamp = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

/** Import lifecycle stepper — mirrors orders/OrderDetail's LifecycleStepper.
 *  CONSOLIDATED is skipped for DOMESTIC orders, which never go through a
 *  freight forwarder. */
function ImportStepper({ order }: { order: ImportOrderDetail }) {
  if (order.status === 'CANCELLED') {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--danger)] rounded-[8px] px-4 py-3 flex items-center gap-2 text-[13px] text-[var(--danger)]">
        <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
          <circle cx="12" cy="12" r="10" /><line x1="4.9" y1="4.9" x2="19.1" y2="19.1" />
        </svg>
        This import was cancelled.
      </div>
    );
  }

  const steps = IMPORT_STATUS_STEPS.filter(
    s => !(order.origin === 'DOMESTIC' && s === 'CONSOLIDATED'),
  );
  const reached = steps.indexOf(order.status);
  const fill = steps.length > 1 && reached > 0 ? (reached / (steps.length - 1)) * 100 : 0;

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] px-6 py-5">
      <div className="relative flex items-start justify-between">
        <div className="absolute left-0 right-0 top-[13px] h-[1.5px] bg-[var(--border)]" />
        <div className="absolute left-0 top-[13px] h-[1.5px] bg-[var(--accent)] transition-all" style={{ width: `${fill}%` }} />
        {steps.map((step, i) => {
          const done = reached >= 0 && i < reached;
          const current = i === reached;
          return (
            <div key={step} className="relative z-[2] flex flex-col items-center gap-2 flex-1">
              <span className={`w-[26px] h-[26px] rounded-full border-[1.5px] flex items-center justify-center ${
                done ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-text)]'
                  : current ? 'border-[var(--info)] text-[var(--info)] bg-[var(--info-t)]'
                    : 'border-[var(--border)] text-[var(--text-muted)] bg-[var(--bg-surface)]'}`}>
                {done
                  ? <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
              </span>
              <span className={`text-[12px] font-medium text-center whitespace-nowrap ${done || current ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                {IMPORT_STATUS_LABEL[step]}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                {done ? '✓' : current ? 'in progress' : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AttachmentsPanel({ order, onUploaded }: { order: ImportOrderDetail; onUploaded: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<ImportAttachmentKind>('VENDOR_INVOICE');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadAttachment(order.id, file, kind);
      onUploaded();
    } catch {
      setError('Upload failed. Try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Panel title="Attachments" note={String(order.attachments.length)}>
      <div className="p-3.5 space-y-2">
        {order.attachments.length === 0 && (
          <p className="text-[11px] text-[var(--text-faint)]">No attachments yet.</p>
        )}
        {order.attachments.map(a => (
          <a
            key={a.id}
            href={`/api/v1/imports/${order.id}/attachments/${a.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 text-[12px] hover:bg-[var(--bg-hover)] -mx-1.5 px-1.5 py-1.5 rounded-[5px] transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="min-w-0 flex-1">
              <span className="block text-[var(--text-primary)] truncate">{ATTACHMENT_KIND_LABEL[a.kind]}</span>
              <span className="block text-[10px] text-[var(--text-faint)]">{fmtStamp(a.uploadedAt)}</span>
            </span>
          </a>
        ))}
      </div>
      <div className="border-t border-[var(--border-sub)] p-3.5 space-y-2">
        <select
          value={kind}
          onChange={e => setKind(e.target.value as ImportAttachmentKind)}
          className="w-full bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[11.5px] text-[var(--text-primary)] outline-none"
        >
          {(Object.keys(ATTACHMENT_KIND_LABEL) as ImportAttachmentKind[]).map(k => (
            <option key={k} value={k}>{ATTACHMENT_KIND_LABEL[k]}</option>
          ))}
        </select>
        <label className="block text-center text-[12px] px-3 py-1.5 rounded-[6px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors cursor-pointer">
          {uploading ? 'Uploading…' : 'Upload file'}
          <input
            ref={fileRef}
            type="file"
            disabled={uploading}
            onChange={e => onUpload(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>
        {error && <p className="text-[11px] text-[var(--danger)]">{error}</p>}
      </div>
    </Panel>
  );
}

export function ImportDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<ImportOrderDetail | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    getImport(id).then(setOrder).catch(() => setError(true));
  }, [id]);

  useEffect(load, [load]);

  if (error) return <p className="text-[12px] text-[var(--danger)]">Import not found.</p>;
  if (!order) return <p className="text-[12px] text-[var(--text-faint)]">Loading…</p>;

  const shippingNative = Number(order.vendorShippingNative || 0);
  const totalNative = Number(order.subtotalNative || 0) + shippingNative;

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mb-1.5">
            <Link to="/imports" className="hover:text-[var(--text-primary)]">Imports</Link>
            <span className="text-[var(--text-faint)]">/</span>
            <span className="font-mono text-[var(--text-secondary)]">{order.number}</span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[24px] font-semibold tracking-[-0.04em] leading-8 text-[var(--text-primary)] font-mono">{order.number}</h1>
            <StatusPill value={IMPORT_STATUS_LABEL[order.status]} />
            <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)] whitespace-nowrap">
              {ORIGIN_LABEL[order.origin]}
            </span>
          </div>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">
            {order.vendorName} · {fmtDate(order.orderDate)} · {order.currency} · fx {Number(order.fxRate).toLocaleString('en-US', { maximumFractionDigits: 4 })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Order total</p>
          <p className="font-mono text-[24px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] leading-none mt-1.5">
            {fmtNative(totalNative, order.currency)}
          </p>
        </div>
      </div>

      <ImportStepper order={order} />

      <div className="grid grid-cols-[1.6fr_1fr] gap-4 max-md:grid-cols-1 items-start">
        <div className="space-y-4">
          <Panel title="Items" note={`${order.lines.length} line${order.lines.length === 1 ? '' : 's'}`}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--bg-overlay)]">
                  {['Item', 'Format', 'Edition', 'Qty', 'Unit price', 'Landed cost'].map(h => (
                    <th key={h} className={thCls}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {order.lines.length === 0 && (
                  <tr><td colSpan={6} className={`${tdCls} text-center text-[var(--text-faint)]`}>No lines.</td></tr>
                )}
                {order.lines.map(line => (
                  <tr key={line.id} className="border-b border-[var(--border-sub)]">
                    <td className={tdCls}>
                      <span className="block text-[var(--text-primary)] truncate max-w-[240px]">{line.artist} — {line.title}</span>
                      {(line.catNumber || line.barcode) && (
                        <span className="block font-mono text-[10px] text-[var(--text-muted)]">
                          {[line.catNumber, line.barcode].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>{fmtFormat(line.format)}</td>
                    <td className={`${tdCls} text-[var(--text-muted)] whitespace-nowrap`}>{line.edition || '—'}</td>
                    <td className={`${tdCls} font-mono text-right`}>
                      {line.qty}
                      {line.qtyBackorder > 0 && <span className="block text-[10px] text-[var(--warning)]">{line.qtyBackorder} b/o</span>}
                    </td>
                    <td className={`${tdCls} font-mono text-right whitespace-nowrap`}>{fmtNative(line.unitPriceNative, order.currency)}</td>
                    <td className={`${tdCls} font-mono text-right whitespace-nowrap text-[var(--text-primary)]`}>
                      {Number(line.landedCostIdr) > 0 ? fmtIdr(line.landedCostIdr) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-3.5 py-3 space-y-1.5 text-[12px]">
              <div className="flex justify-between text-[var(--text-secondary)]"><span>Subtotal</span><span className="font-mono">{fmtNative(order.subtotalNative, order.currency)}</span></div>
              {shippingNative > 0 && <div className="flex justify-between text-[var(--text-secondary)]"><span>Vendor shipping</span><span className="font-mono">{fmtNative(shippingNative, order.currency)}</span></div>}
              <div className="flex justify-between text-[14px] font-semibold text-[var(--text-primary)] pt-1.5 border-t border-[var(--border-sub)]">
                <span>Total</span><span className="font-mono">{fmtNative(totalNative, order.currency)}</span>
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Payment">
            <div className="p-3.5 space-y-2 text-[12px]">
              {[
                ['Method', PAYMENT_METHOD_LABEL[order.paymentMethod]],
                ...(order.paidBy ? [['Paid by', order.paidBy]] : []),
                ['Reimbursement', REIMBURSEMENT_LABEL[order.reimbursementStatus] ?? order.reimbursementStatus],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <span className="text-[var(--text-muted)]">{label}</span>
                  <span className="text-right text-[var(--text-primary)]">{value}</span>
                </div>
              ))}
              {order.notes && (
                <p className="text-[11.5px] text-[var(--text-secondary)] pt-2 mt-2 border-t border-[var(--border-sub)] whitespace-pre-wrap">{order.notes}</p>
              )}
            </div>
          </Panel>

          <AttachmentsPanel order={order} onUploaded={load} />

          {order.consolidation && (
            <Panel title="Consolidation">
              <div className="p-3.5 space-y-2 text-[12px]">
                <div className="flex justify-between gap-3"><span className="text-[var(--text-muted)]">Number</span><span className="font-mono text-[var(--text-primary)]">{order.consolidation.number}</span></div>
                <div className="flex justify-between gap-3"><span className="text-[var(--text-muted)]">Forwarder</span><span className="text-[var(--text-primary)]">{order.consolidation.forwarderName}</span></div>
                <div className="flex justify-between gap-3"><span className="text-[var(--text-muted)]">Invoice</span><span className="font-mono text-[var(--text-primary)]">{fmtIdr(order.consolidation.forwarderInvoiceIdr)}</span></div>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

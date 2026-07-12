import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fmtDate, fmtIdr } from '../../api/ops';
import type { ConsolidationStatus } from '../../api/consolidations';
import { CONSOLIDATION_STATUS_LABEL } from '../consolidations/shared';
import {
  commitImport, getImport, getImports, IMPORT_STATUS_STEPS, matchImport, priceImport, uploadAttachment,
  type ImportAttachmentKind, type ImportChannelPrice, type ImportConsolidation, type ImportOrderDetail,
  type ImportOrderLine, type ImportStatus,
} from '../../api/imports';
import { Panel, StatusPill, tdCls, thCls } from '../../components/ui/Page';
import { GrooveDisc } from '../../components/ui/Cover';
import {
  CHANNEL_LABEL, CHANNEL_ORDER, fmtFormat, fmtNative,
  IMPORT_STATUS_LABEL, MATCH_STATUS_LABEL, ORIGIN_LABEL, PAYMENT_METHOD_LABEL,
} from './shared';

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

const actionBtnOutline =
  'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-[6px] border border-[var(--border)] text-[12.5px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full';
const actionBtnPrimary =
  'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] text-[12.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed w-full';
const navBtnCls =
  'flex items-center gap-1.5 px-3 py-[7px] rounded-[6px] border border-[var(--border)] text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent';

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

/** Line items — vinyl-groove cover disc + artist/title/meta + qty + landed
 *  cost, mirroring mockup-order-detail's `.line` rows. Totals sit in the same
 *  card, beneath the last line (mockup-order-detail's `.totals` block). Only
 *  fields actually persisted on ImportOrder are shown — the parser's
 *  taxNative/otherFeesNative live on the pre-commit review step only. */
function LineItemsCard({ order }: { order: ImportOrderDetail }) {
  const totalUnits = order.lines.reduce((sum, l) => sum + l.qty, 0);
  const shippingNative = Number(order.vendorShippingNative || 0);
  const totalNative = Number(order.subtotalNative || 0) + shippingNative;
  const idrEquivalent = totalNative * Number(order.fxRate);

  return (
    <Panel
      title="Line items"
      note={`${order.lines.length} item${order.lines.length === 1 ? '' : 's'} · ${totalUnits} unit${totalUnits === 1 ? '' : 's'}`}
    >
      {order.lines.length === 0 && (
        <p className="px-3.5 py-5 text-[11px] text-[var(--text-faint)]">No lines.</p>
      )}
      {order.lines.map(line => (
        <div key={line.id} className="flex items-center gap-3 px-3.5 py-3 border-t border-[var(--border-sub)] first:border-t-0">
          <span className="w-[52px] h-[52px] rounded-[4px] flex-shrink-0 overflow-hidden border border-[var(--border-sub)]">
            <GrooveDisc />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] truncate">
              <span className="font-medium text-[var(--text-primary)]">{line.artist}</span>
              <span className="text-[var(--text-secondary)]"> — {line.title}</span>
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 flex items-center gap-2 flex-wrap">
              {fmtFormat(line.format) && <span>{fmtFormat(line.format)}</span>}
              {line.edition && (
                <span className="inline-flex text-[10px] px-1.5 py-[1px] rounded-[4px] border border-[var(--border)] text-[var(--text-secondary)]">
                  {line.edition}
                </span>
              )}
              {(line.catNumber || line.barcode) && (
                <span className="font-mono">{[line.catNumber, line.barcode].filter(Boolean).join(' · ')}</span>
              )}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <StatusPill value={MATCH_STATUS_LABEL[line.matchStatus]} />
              {line.releaseId && (
                <Link to={`/inventory/${line.releaseId}/edit`} className="text-[10px] text-[var(--info)] hover:underline">
                  → release{line.createdRelease ? ' (new)' : ''}
                </Link>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0 w-9">
            <p className="font-mono text-[12px] text-[var(--text-muted)]">×{line.qty}</p>
            {line.qtyBackorder > 0 && <p className="text-[10px] text-[var(--warning)] mt-0.5">{line.qtyBackorder} b/o</p>}
          </div>
          <div className="text-right flex-shrink-0 min-w-[104px]">
            <p className="font-mono text-[13px] font-medium text-[var(--text-primary)]">
              {Number(line.landedCostIdr) > 0 ? fmtIdr(line.landedCostIdr) : fmtNative(line.unitPriceNative, order.currency)}
            </p>
            {Number(line.landedCostIdr) > 0 && (
              <p className="text-[10px] text-[var(--text-faint)] mt-0.5">{fmtNative(line.unitPriceNative, order.currency)} unit</p>
            )}
          </div>
        </div>
      ))}

      <div className="px-3.5 py-3.5 border-t border-[var(--border-sub)] space-y-1.5">
        <div className="flex justify-between text-[12px] text-[var(--text-secondary)]">
          <span>Subtotal</span><span className="font-mono">{fmtNative(order.subtotalNative, order.currency)}</span>
        </div>
        {shippingNative > 0 && (
          <div className="flex justify-between text-[12px] text-[var(--text-secondary)]">
            <span>Vendor shipping</span><span className="font-mono">{fmtNative(shippingNative, order.currency)}</span>
          </div>
        )}
        <div className="flex justify-between items-baseline pt-2 mt-1 border-t border-[var(--border-sub)]">
          <span className="text-[14px] font-semibold text-[var(--text-primary)]">Total</span>
          <span className="text-right">
            <span className="block font-mono text-[17px] font-semibold text-[var(--text-primary)] leading-none">{fmtNative(totalNative, order.currency)}</span>
            {order.currency !== 'IDR' && (
              <span className="block font-mono text-[10px] text-[var(--text-muted)] mt-1">≈ {fmtIdr(idrEquivalent)}</span>
            )}
          </span>
        </div>
      </div>
    </Panel>
  );
}

/** IDR figures use the shared `fmtIdr` (Rp, no decimals); everything else
 *  (USD list prices) renders with 2 decimals — matches the two currencies
 *  ChannelPricingConfig actually issues (see ImportChannelPrice['currency']). */
const fmtChannelPrice = (currency: string, value: string | number): string =>
  currency === 'IDR' ? fmtIdr(value) : `$${Number(value).toFixed(2)}`;

function ChannelPricingPanel({ lines }: { lines: ImportOrderLine[] }) {
  const hasPrices = lines.some(l => l.channelPrices.length > 0);

  return (
    <Panel title="Channel pricing">
      {!hasPrices ? (
        <p className="px-3.5 py-4 text-[11px] text-[var(--text-faint)]">
          No prices yet — click Calculate pricing.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              {['Item', 'Landed (IDR)', ...CHANNEL_ORDER.map(c => CHANNEL_LABEL[c])].map(h => (
                <th key={h} className={thCls}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map(line => {
              const byChannel = new Map<string, ImportChannelPrice>(line.channelPrices.map(p => [p.channel, p]));
              return (
                <tr key={line.id} className="border-b border-[var(--border-sub)]">
                  <td className={tdCls}>
                    <span className="block text-[var(--text-primary)] truncate max-w-[220px]">{line.artist} — {line.title}</span>
                  </td>
                  <td className={`${tdCls} font-mono text-right whitespace-nowrap`}>
                    {Number(line.landedCostIdr) > 0 ? fmtIdr(line.landedCostIdr) : '—'}
                  </td>
                  {CHANNEL_ORDER.map(channel => {
                    const p = byChannel.get(channel);
                    return (
                      <td key={channel} className={`${tdCls} font-mono text-right whitespace-nowrap`}>
                        {p ? (
                          <>
                            {fmtChannelPrice(p.currency, p.price)}
                            {p.overridden && <span className="text-[var(--text-muted)]" title="Manually edited"> (edited)</span>}
                          </>
                        ) : '—'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

type TimelineTone = 'ok' | 'mut' | 'warn';
const TIMELINE_TONE_CLS: Record<TimelineTone, string> = {
  ok: 'bg-[var(--success-t)] border-[var(--success)]',
  mut: 'bg-[var(--neutral-t)] border-[var(--border)]',
  warn: 'bg-[var(--warning-t)] border-[var(--warning)]',
};

const STEP_TIMELINE_LABEL: Record<ImportStatus, string> = {
  DRAFT: 'Draft saved',
  SUBMITTED: 'Import submitted',
  CONSOLIDATED: 'Consolidated for freight',
  PRICED: 'Pricing calculated',
  RECEIVED: 'Stock received',
  INVENTORY_UPDATED: 'Inventory updated',
  CANCELLED: 'Import cancelled',
};

/** Activity log derived from the import's own state — mirrors how
 *  OrderDetail derives its timeline from real timestamps rather than a
 *  separate audit log. Only steps actually reached are shown (the stepper
 *  above already covers what's still pending), newest first. */
function buildTimeline(order: ImportOrderDetail): Array<{ title: string; meta: string; tone: TimelineTone }> {
  if (order.status === 'CANCELLED') {
    return [
      { title: STEP_TIMELINE_LABEL.CANCELLED, meta: fmtStamp(order.updatedAt), tone: 'warn' },
      { title: STEP_TIMELINE_LABEL.SUBMITTED, meta: fmtStamp(order.createdAt), tone: 'mut' },
    ];
  }

  const steps = IMPORT_STATUS_STEPS.filter(s => !(order.origin === 'DOMESTIC' && s === 'CONSOLIDATED'));
  const reached = steps.indexOf(order.status);

  return steps
    .map((step, i) => {
      const done = reached >= 0 && i <= reached;
      let meta = '—';
      if (step === 'SUBMITTED') meta = fmtStamp(order.createdAt);
      else if (step === 'CONSOLIDATED' && order.consolidation) meta = fmtStamp(order.consolidation.createdAt);
      else if (done && i === reached) meta = fmtStamp(order.updatedAt);
      else if (done) meta = '✓';
      return { title: STEP_TIMELINE_LABEL[step], meta, tone: (done ? 'ok' : 'mut') as TimelineTone, done };
    })
    .filter(ev => ev.done)
    .reverse();
}

function TimelineCard({ order }: { order: ImportOrderDetail }) {
  const events = buildTimeline(order);
  return (
    <Panel title="Activity log" note={`${events.length} event${events.length === 1 ? '' : 's'}`}>
      {events.length === 0 ? (
        <p className="px-3.5 py-4 text-[11px] text-[var(--text-faint)]">No activity yet.</p>
      ) : (
        <div className="p-3.5 space-y-0">
          {events.map((ev, i) => (
            <div key={ev.title} className="flex gap-3 pb-3.5 last:pb-0 relative">
              {i < events.length - 1 && <span className="absolute left-[7px] top-4 bottom-0 w-px bg-[var(--border)]" />}
              <span className={`w-[15px] h-[15px] rounded-full border-2 flex-shrink-0 mt-0.5 ${TIMELINE_TONE_CLS[ev.tone]}`} />
              <span className="min-w-0">
                <span className="block text-[12.5px] text-[var(--text-primary)] leading-tight">{ev.title}</span>
                <span className="block text-[11px] text-[var(--text-muted)] mt-0.5 font-mono">{ev.meta}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

type InfoRow = { label: string; value: ReactNode };

function InfoRows({ rows }: { rows: InfoRow[] }) {
  return (
    <div className="p-3.5 space-y-2 text-[12px]">
      {rows.map(row => (
        <div key={row.label} className="flex justify-between gap-3">
          <span className="text-[var(--text-muted)]">{row.label}</span>
          <span className="text-right text-[var(--text-primary)]">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function SupplierCard({ order }: { order: ImportOrderDetail }) {
  const rows: InfoRow[] = [
    { label: 'Vendor', value: order.vendorName },
    { label: 'Origin', value: ORIGIN_LABEL[order.origin] },
    { label: 'Currency', value: order.currency },
    { label: 'FX rate', value: <span className="font-mono">{Number(order.fxRate).toLocaleString('en-US', { maximumFractionDigits: 4 })}</span> },
    { label: 'Order date', value: fmtDate(order.orderDate) },
    { label: 'Payment', value: PAYMENT_METHOD_LABEL[order.paymentMethod] + (order.paidBy ? ` · ${order.paidBy}` : '') },
    { label: 'Reimbursement', value: REIMBURSEMENT_LABEL[order.reimbursementStatus] ?? order.reimbursementStatus },
  ];
  return (
    <Panel title="Supplier">
      <InfoRows rows={rows} />
      {order.notes && (
        <p className="px-3.5 pb-3.5 text-[11.5px] text-[var(--text-secondary)] pt-2 border-t border-[var(--border-sub)] whitespace-pre-wrap">{order.notes}</p>
      )}
    </Panel>
  );
}

function ConsolidationCard({ consolidation }: { consolidation: ImportConsolidation }) {
  const rows: InfoRow[] = [
    { label: 'Number', value: <span className="font-mono">{consolidation.number}</span> },
    { label: 'Status', value: <StatusPill value={CONSOLIDATION_STATUS_LABEL[consolidation.status as ConsolidationStatus] ?? consolidation.status} /> },
    { label: 'Forwarder', value: consolidation.forwarderName },
    { label: 'Invoice', value: <span className="font-mono">{fmtIdr(consolidation.forwarderInvoiceIdr)}</span> },
  ];
  if (consolidation.weightKgTotal != null) {
    rows.push({ label: 'Weight', value: <span className="font-mono">{Number(consolidation.weightKgTotal).toLocaleString('en-US', { maximumFractionDigits: 2 })} kg</span> });
  }
  if (consolidation.trackingRaw) {
    rows.push({ label: 'Tracking', value: <span className="font-mono break-all">{consolidation.trackingRaw}</span> });
  }
  return (
    <Panel title="Consolidation">
      <InfoRows rows={rows} />
    </Panel>
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

interface ActionsCardProps {
  status: ImportStatus;
  pricing: boolean;
  pricingError: string | null;
  onCalculatePricing: () => void;
  matching: boolean;
  matchError: string | null;
  onMatch: () => void;
  committing: boolean;
  commitError: string | null;
  commitMessage: string | null;
  onCommit: () => void;
}

function ActionsCard({
  status, pricing, pricingError, onCalculatePricing,
  matching, matchError, onMatch,
  committing, commitError, commitMessage, onCommit,
}: ActionsCardProps) {
  return (
    <Panel title="Actions">
      <div className="p-3.5 flex flex-col gap-2">
        <button onClick={onCalculatePricing} disabled={pricing} className={actionBtnOutline}>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M9 3v18M15 3v18M3 9h18M3 15h18" /></svg>
          {pricing ? 'Calculating…' : 'Calculate pricing'}
        </button>
        {pricingError && <p className="text-[11px] text-[var(--danger)]">{pricingError}</p>}

        <button onClick={onMatch} disabled={matching} className={actionBtnOutline}>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {matching ? 'Matching…' : 'Match'}
        </button>
        {matchError && <p className="text-[11px] text-[var(--danger)]">{matchError}</p>}

        <div className="h-px bg-[var(--border-sub)] my-1" />

        {status === 'INVENTORY_UPDATED' ? (
          <p className="flex items-center justify-center gap-1.5 py-2 text-[12.5px] font-medium text-[var(--success)]">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            Inventory updated
          </p>
        ) : (
          <button onClick={onCommit} disabled={committing || status !== 'PRICED'} className={actionBtnPrimary}>
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            {committing ? 'Committing…' : 'Commit to inventory'}
          </button>
        )}
        {commitError && <p className="text-[11px] text-[var(--danger)]">{commitError}</p>}
        {commitMessage && <p className="text-[11px] text-[var(--success)]">{commitMessage}</p>}
      </div>
    </Panel>
  );
}

/** Sibling ids used for the header's Prev/Next nav — computed from the
 *  first page of the import list (newest-first, per the API's default
 *  `orderBy: { createdAt: 'desc' }`). Imports beyond that first page won't
 *  have working neighbours; acceptable for a back-office list this size. */
function useImportNeighbors(id: string | undefined) {
  const [neighbors, setNeighbors] = useState<{ prevId: string | null; nextId: string | null }>({ prevId: null, nextId: null });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getImports({ limit: 100 }).then(res => {
      if (cancelled) return;
      const ids = res.items.map(r => r.id);
      const idx = ids.indexOf(id);
      if (idx === -1) {
        setNeighbors({ prevId: null, nextId: null });
        return;
      }
      setNeighbors({
        prevId: idx > 0 ? ids[idx - 1] : null,
        nextId: idx < ids.length - 1 ? ids[idx + 1] : null,
      });
    }).catch(() => setNeighbors({ prevId: null, nextId: null }));
    return () => { cancelled = true; };
  }, [id]);

  return neighbors;
}

export function ImportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<ImportOrderDetail | null>(null);
  const [error, setError] = useState(false);
  const [pricing, setPricing] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState<string | null>(null);

  const { prevId, nextId } = useImportNeighbors(id);

  const load = useCallback(() => {
    if (!id) return;
    getImport(id).then(setOrder).catch(() => setError(true));
  }, [id]);

  useEffect(load, [load]);

  const onCalculatePricing = async () => {
    if (!id) return;
    setPricing(true);
    setPricingError(null);
    try {
      await priceImport(id);
      load();
    } catch {
      setPricingError('Could not calculate pricing. Check FX rate and try again.');
    } finally {
      setPricing(false);
    }
  };

  const onMatch = async () => {
    if (!id) return;
    setMatching(true);
    setMatchError(null);
    try {
      await matchImport(id);
      load();
    } catch {
      setMatchError('Could not run matching. Try again.');
    } finally {
      setMatching(false);
    }
  };

  const onCommit = async () => {
    if (!id) return;
    setCommitting(true);
    setCommitError(null);
    setCommitMessage(null);
    try {
      const result = await commitImport(id);
      setCommitMessage(`Committed — ${result.created} created, ${result.updated} updated`);
      load();
    } catch {
      setCommitError('Import must be priced before committing.');
    } finally {
      setCommitting(false);
    }
  };

  if (error) return <p className="text-[12px] text-[var(--danger)]">Import not found.</p>;
  if (!order) return <p className="text-[12px] text-[var(--text-faint)]">Loading…</p>;

  return (
    <div className="space-y-4">
      {/* header — number + state on the left, Prev/Next on the right (mirrors mockup-order-detail's order-hdr) */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mb-1.5">
            <Link to="/purchase-orders?tab=imports" className="hover:text-[var(--text-primary)]">Imports</Link>
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
            {order.vendorName} · {fmtDate(order.orderDate)} · {order.currency}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => prevId && navigate(`/imports/${prevId}`)} disabled={!prevId} className={navBtnCls}>
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Prev
          </button>
          <button onClick={() => nextId && navigate(`/imports/${nextId}`)} disabled={!nextId} className={navBtnCls}>
            Next
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>

      <ImportStepper order={order} />

      {/* two-column grid: main 1fr + 340px right rail, collapsing under 1100px (mirrors mockup-order-detail's .detail-grid) */}
      <div className="grid grid-cols-[1fr_340px] gap-4 max-[1100px]:grid-cols-1 items-start">
        <div className="space-y-4">
          <LineItemsCard order={order} />
          <ChannelPricingPanel lines={order.lines} />
          <TimelineCard order={order} />
        </div>

        <div className="space-y-4">
          <ActionsCard
            status={order.status}
            pricing={pricing} pricingError={pricingError} onCalculatePricing={onCalculatePricing}
            matching={matching} matchError={matchError} onMatch={onMatch}
            committing={committing} commitError={commitError} commitMessage={commitMessage} onCommit={onCommit}
          />
          <SupplierCard order={order} />
          {order.consolidation && <ConsolidationCard consolidation={order.consolidation} />}
          <AttachmentsPanel order={order} onUploaded={load} />
        </div>
      </div>
    </div>
  );
}

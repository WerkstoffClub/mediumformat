import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { fmtIdr } from '../../api/ops';
import { formatLabel } from '../../api/pos';
import { getPosSale, saleErrorMessage, voidPosSale, type PosSale } from '../../api/posSales';
import { ReceiptModal, type ReceiptData } from '../../components/ui/Receipt';
import { STORE_ADDRESS } from '../../lib/store';
import type { EdcBank } from './PaymentPanel';

/** Details the cashier copies from the bank EDC slip (MF has no terminal integration). */
export interface EdcResult {
  approvalCode: string;
  rrn: string;
  scheme: string;
  /** Masked card, e.g. "**** 1234"; empty when not entered. */
  pan: string;
}

export const EDC_SCHEMES = ['Visa', 'Mastercard', 'GPN', 'JCB', 'Amex', 'Debit'] as const;

/** Validate the slip fields; returns the result or an error message. */
export function parseEdcSlip(input: { approvalCode: string; rrn: string; last4: string; scheme: string }):
  { ok: true; result: EdcResult } | { ok: false; error: string } {
  const approvalCode = input.approvalCode.trim().toUpperCase();
  const rrn = input.rrn.trim();
  const last4 = input.last4.trim();
  if (!/^[A-Z0-9]{6}$/.test(approvalCode)) return { ok: false, error: 'Approval code is the 6 letters/digits printed on the EDC slip.' };
  if (rrn && !/^\d{6,12}$/.test(rrn)) return { ok: false, error: 'RRN / Ref is 6–12 digits.' };
  if (last4 && !/^\d{4}$/.test(last4)) return { ok: false, error: 'Card: enter the last 4 digits only.' };
  return { ok: true, result: { approvalCode, rrn, scheme: input.scheme, pan: last4 ? `**** ${last4}` : '' } };
}

/** EDC payment: the cashier runs the card on the bank terminal, then records the slip here. */
export function EdcOverlay({
  bank, amount, onApproved, onCancel,
}: {
  bank: EdcBank; amount: number;
  onApproved: (result: EdcResult) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ approvalCode: '', rrn: '', last4: '', scheme: '' });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setError(null);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseEdcSlip(form);
    if (parsed.ok) onApproved(parsed.result); else setError(parsed.error);
  };

  const input = 'w-full bg-[var(--bg-base)] border border-[var(--border)] rounded-md px-3 py-2 text-[14px] font-mono text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]';
  const label = 'block text-[11px] uppercase tracking-[0.05em] font-semibold text-[var(--text-muted)] mb-1.5';

  return (
    <Overlay onBackdrop={onCancel}>
      <Sheet title={`${bank} terminal`} tag="EDC · Acquirer" onClose={onCancel}>
        <form onSubmit={submit}>
          <div className="text-center mb-5">
            <p className="font-mono text-[28px] font-medium text-[var(--text-primary)]">{fmtIdr(amount)}</p>
            <p className="text-[13px] text-[var(--text-secondary)] mt-1">
              Charge this amount on the {bank} EDC, then copy the details from the approved slip.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={label} htmlFor="edc-appr">Approval code</label>
              <input id="edc-appr" className={input} value={form.approvalCode} onChange={set('approvalCode')} maxLength={6} autoFocus autoComplete="off" required />
            </div>
            <div className="col-span-2">
              <label className={label} htmlFor="edc-rrn">RRN / Ref <span className="normal-case font-normal">(optional)</span></label>
              <input id="edc-rrn" className={input} value={form.rrn} onChange={set('rrn')} maxLength={12} inputMode="numeric" autoComplete="off" />
            </div>
            <div>
              <label className={label} htmlFor="edc-last4">Card last 4 <span className="normal-case font-normal">(opt.)</span></label>
              <input id="edc-last4" className={input} value={form.last4} onChange={set('last4')} maxLength={4} inputMode="numeric" autoComplete="off" />
            </div>
            <div>
              <label className={label} htmlFor="edc-scheme">Card type <span className="normal-case font-normal">(opt.)</span></label>
              <select id="edc-scheme" className={input} value={form.scheme} onChange={set('scheme')}>
                <option value="">—</option>
                {EDC_SCHEMES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {error && <p role="alert" className="mt-3 text-[12px] text-[var(--danger)]">{error}</p>}
          <div className="flex gap-2 mt-5">
            <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-md border border-[var(--border)] text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-text)] text-[13px] font-semibold">Record payment</button>
          </div>
        </form>
      </Sheet>
    </Overlay>
  );
}

/** Waiting for a Xendit payment: shows the payment page as a QR, polls the sale until the webhook settles it. */
export function XenditOverlay({
  sale, onPaid, onClosed,
}: {
  sale: PosSale;
  onPaid: (sale: PosSale) => void;
  /** The sale ended without payment (cancelled here, or the invoice expired). */
  onClosed: (message: string) => void;
}) {
  const payment = sale.payments.find(p => p.method === 'XENDIT');
  const url = payment?.xenditInvoiceUrl ?? null;
  const [qr, setQr] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!url) return;
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } })
      .then(setQr).catch(() => setQr(null));
  }, [url]);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const s = await getPosSale(sale.id);
        if (!alive) return;
        if (s.status === 'PAID') onPaid(s);
        else if (s.status === 'EXPIRED') onClosed('The Xendit payment expired. Nothing was charged; the items are back in stock.');
        else if (s.status === 'VOIDED') onClosed('The sale was cancelled.');
      } catch { /* keep polling; a blip should not end the sale */ }
    };
    const poll = setInterval(tick, 3000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { alive = false; clearInterval(poll); clearInterval(clock); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale.id]);

  const cancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      await voidPosSale(sale.id);
      onClosed('Payment cancelled. Nothing was charged; the items are back in stock.');
    } catch (e) {
      setError(saleErrorMessage(e));
      setCancelling(false);
    }
  };

  const left = payment?.expiresAt ? Math.max(0, Math.floor((new Date(payment.expiresAt).getTime() - now) / 1000)) : null;

  return (
    <Overlay>
      <Sheet title="Xendit payment" tag={payment?.xenditChannel ?? 'Online gateway'}>
        <div className="text-center">
          <p className="font-mono text-[28px] font-medium text-[var(--text-primary)]">{fmtIdr(sale.totalIdr)}</p>
          <p className="font-mono text-[12px] text-[var(--text-muted)] mt-1">{sale.number}</p>
          <div className="w-52 h-52 mx-auto my-5 rounded-lg bg-white p-2.5 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full">
            {qr ? <span className="w-full h-full [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: qr }} /> : <span className="text-[12px] text-[#555]">{url ? 'Preparing code…' : 'No payment link'}</span>}
          </div>
          <p className="text-[13px] text-[var(--text-secondary)]">Ask the customer to scan this with their phone camera and pay on Xendit&apos;s page.</p>
          {url && (
            <a href={url} target="_blank" rel="noreferrer" className="inline-block mt-2 text-[12px] text-[var(--text-primary)] underline underline-offset-2">Open payment page</a>
          )}
          <p className="flex items-center justify-center gap-2 mt-4 text-[12px] text-[var(--text-secondary)]">
            <span className="w-2 h-2 rounded-full bg-[var(--warning)] animate-pulse" />
            Waiting for Xendit{left != null ? ` · expires in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : ''}
          </p>
          {error && <p role="alert" className="mt-3 text-[12px] text-[var(--danger)]">{error}</p>}
          <button onClick={cancel} disabled={cancelling} className="block mx-auto mt-5 text-[12px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] underline underline-offset-2 disabled:opacity-50">
            {cancelling ? 'Cancelling…' : 'Cancel payment'}
          </button>
        </div>
      </Sheet>
    </Overlay>
  );
}

/** Receipt data from a sale the server recorded (number, prices and totals are the server's). */
export function summaryFromSale(sale: PosSale): SaleSummary {
  const p = sale.payments[0];
  const method =
    p?.method === 'CASH' ? 'Cash'
      : p?.method === 'EDC' ? ['EDC', p.edcBank, p.cardScheme].filter(Boolean).join(' · ')
        : p?.method === 'XENDIT' ? ['Xendit', p.xenditPaidMethod ?? p.xenditChannel].filter(Boolean).join(' · ')
          : p?.method === 'OTHER' ? `${p.otherMethodName ?? 'Other'} · imported from DealPOS`
            : '—';
  const when = new Date(sale.paidAt ?? sale.createdAt);
  return {
    orderNumber: sale.number,
    datetime: when.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ''),
    method,
    lines: sale.lines.map(l => ({
      name: `${l.artist} — ${l.title}`,
      meta: [formatLabel(l.format), `×${l.qty}`].join(' · '),
      amount: l.unitPriceIdr * l.qty,
    })),
    subtotal: sale.subtotalIdr,
    discount: sale.discountIdr,
    tax: sale.taxIdr,
    amount: sale.totalIdr,
    change: p?.changeIdr ?? undefined,
    edc: p?.method === 'EDC' && p.edcApprovalCode
      ? { approvalCode: p.edcApprovalCode, rrn: p.edcRrn ?? '', scheme: p.cardScheme ?? '', pan: p.cardLast4 ? `**** ${p.cardLast4}` : '' }
      : undefined,
  };
}

export interface SaleReceiptLine {
  name: string;
  meta: string;
  amount: number;
}

export interface SaleSummary {
  orderNumber: string;
  datetime: string;
  method: string;
  lines: SaleReceiptLine[];
  subtotal: number;
  discount: number;
  tax: number;
  amount: number;
  change?: number;
  edc?: EdcResult;
}

/** POS post-sale receipt — the same paper the Orders screen prints, with a
 *  "New sale" reset as the primary action. */
export function SuccessModal({ sale, onNewSale }: { sale: SaleSummary; onNewSale: () => void }) {
  const summary: ReceiptData['summary'] = [{ label: 'Subtotal', value: sale.subtotal }];
  if (sale.discount > 0) summary.push({ label: 'Discount', value: sale.discount, kind: 'discount' });
  summary.push({ label: 'PPN 11%', value: sale.tax });

  const payment: ReceiptData['payment'] = [{ label: 'Payment', value: sale.method }];
  if (sale.change != null && sale.change > 0) payment.push({ label: 'Change', value: fmtIdr(sale.change), mono: true });
  if (sale.edc) {
    payment.push({ label: 'Approval code', value: sale.edc.approvalCode, mono: true });
    if (sale.edc.rrn) payment.push({ label: 'RRN / Ref', value: sale.edc.rrn, mono: true });
    if (sale.edc.pan) payment.push({ label: 'Card', value: sale.edc.pan, mono: true });
  }

  const data: ReceiptData = {
    address: [...STORE_ADDRESS],
    number: sale.orderNumber,
    datetime: sale.datetime,
    lines: sale.lines,
    summary,
    total: sale.amount,
    payment,
    footer: ['Terima kasih — thank you', 'Goods sold are not returnable · Keep this receipt'],
  };

  return (
    <ReceiptModal
      data={data}
      primary={{
        label: 'New sale',
        onClick: onNewSale,
        icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
      }}
    />
  );
}

/* ── Shared overlay chrome ─────────────────────────────────── */
function Overlay({ children, onBackdrop }: { children: React.ReactNode; onBackdrop?: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
      onClick={onBackdrop ? e => { if (e.target === e.currentTarget) onBackdrop(); } : undefined}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  );
}

function Sheet({
  title, tag, onClose, children,
}: {
  title: string; tag: string; onClose?: () => void; children: React.ReactNode;
}) {
  return (
    <div className="w-[440px] max-w-full max-h-[92vh] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,.5)]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-sub)]">
        <div className="flex items-center gap-2.5">
          <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{title}</h3>
          <span className="text-[9px] uppercase tracking-[0.05em] px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-muted)]">{tag}</span>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-md border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        )}
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}

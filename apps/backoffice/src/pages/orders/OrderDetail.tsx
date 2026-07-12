import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { channelLabel, customerLabel, fmtIdr, getOrder, type OrderDetail as Order } from '../../api/ops';
import { ChannelPill, StatusPill } from '../../components/ui/Page';
import { ReleaseCover } from '../../components/ui/Cover';
import { ReceiptModal, type ReceiptData } from '../../components/ui/Receipt';

/* DealPOS often stamps payments at 00:00 local — treat those as date-only. */
const isDateOnly = (d: Date) => d.getHours() === 0 && d.getMinutes() === 0;
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const fmtStamp = (v: string | null | undefined) => {
  if (!v) return '—';
  const d = new Date(v);
  return d.toLocaleString('en-GB', isDateOnly(d)
    ? { day: 'numeric', month: 'short', year: 'numeric' }
    : { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/* Paid line follows the placed line — if it's the same day AND has a real time,
   show just the time. Otherwise show the date (with time when available). */
const fmtPaidRelative = (paid: string, placed: Date) => {
  const d = new Date(paid);
  if (isDateOnly(d)) return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  if (sameDay(d, placed)) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const fmtDateTime = (v: string | null | undefined) => {
  if (!v) return '—';
  const d = new Date(v);
  return d.toLocaleString('en-GB', isDateOnly(d)
    ? { day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const fmtFormat = (f?: string | null) =>
  f ? f.replace('TWO_', '2×').replace('THREE_', '3×').replace('TWELVE_INCH', '12"').replace('SEVEN_INCH', '7"').replace('_', ' ') : null;

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('') || '?';

/* ─── 6-step lifecycle stepper (marketplace / shipping orders) ────────────
   States map onto DealPOS fulfillment + payment:
   Pending → Processing → Packed → Shipped → Delivered → Completed
   • Pending    — order exists (always ✓)
   • Processing — payment received OR fulfillment started
   • Packed     — fulfillment = Partial or Sent
   • Shipped    — fulfillment = Sent (handed to courier)
   • Delivered  — Sent + Paid (marketplace payout implies delivery)
   • Completed  — Sent + Paid (fully settled) */
const LIFECYCLE_STEPS = ['Pending', 'Processing', 'Packed', 'Shipped', 'Delivered', 'Completed'] as const;

function computeReached(order: Order): number {
  const paid = order.paymentStatus === 'Paid';
  const sent = order.fulfillment === 'Sent';
  const partial = order.fulfillment === 'Partial';
  let reached = 0;                          // Pending is always done
  if (paid || partial || sent) reached = 1; // Processing
  if (partial || sent) reached = 2;         // Packed
  if (sent) reached = 3;                    // Shipped
  if (sent && paid) reached = 5;            // Delivered + Completed
  return reached;
}

function StepIcon({ state }: { state: 'done' | 'current' | 'idle' }) {
  if (state === 'done') {
    return (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (state === 'current') {
    return (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 14" />
      </svg>
    );
  }
  return <span className="w-1.5 h-1.5 rounded-full bg-current" />;
}

function LifecycleStepper({ order }: { order: Order }) {
  if (order.fulfillment === 'Returned') {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--danger)] rounded-[8px] px-4 py-3 flex items-center gap-2 text-[13px] text-[var(--danger)]">
        <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
        </svg>
        Order returned — reversed in DealPOS.
      </div>
    );
  }
  const reached = computeReached(order);
  const paid = order.paymentStatus === 'Paid';
  const fill = (reached / (LIFECYCLE_STEPS.length - 1)) * 100;
  const paidTime = order.payments[0]?.date ?? order.date;

  const timeFor = (i: number, state: 'done' | 'current' | 'idle'): string => {
    if (i === 0) return fmtDateTime(order.created ?? order.date);
    if (i === 5 && paid) return fmtDateTime(paidTime);
    return state === 'current' ? 'in progress' : '—';
  };

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] px-6 py-5">
      <div className="relative flex items-start justify-between">
        <div className="absolute left-0 right-0 top-[13px] h-[1.5px] bg-[var(--border)]" />
        <div
          className="absolute left-0 top-[13px] h-[1.5px] bg-[var(--accent)] transition-all"
          style={{ width: `${fill}%` }}
        />
        {LIFECYCLE_STEPS.map((label, i) => {
          const done = i <= reached;
          const current = i === reached + 1;
          const state: 'done' | 'current' | 'idle' = done ? 'done' : current ? 'current' : 'idle';
          return (
            <div key={label} className="relative z-[2] flex flex-col items-center gap-2 flex-1 min-w-[68px]">
              <span
                className={`w-[26px] h-[26px] rounded-full border-[1.5px] flex items-center justify-center ${
                  done
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-text)]'
                    : current
                      ? 'border-[var(--info)] text-[var(--info)] bg-[var(--info-t)]'
                      : 'border-[var(--border)] text-[var(--text-muted)] bg-[var(--bg-surface)]'
                }`}
              >
                <StepIcon state={state} />
              </span>
              <span className={`text-[12px] font-medium text-center whitespace-nowrap ${done || current ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                {label}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                {timeFor(i, state)}
              </span>
            </div>
          );
        })}
      </div>
      {order.paymentStatus === 'Unpaid' && (
        <p className="text-[11px] text-[var(--warning)] mt-3">
          Awaiting settlement — {channelLabel(order.tag) || 'the marketplace'} pays out on its own schedule.
        </p>
      )}
    </div>
  );
}

/* ─── receipt shape (unchanged from previous impl) ────────────────────────
   Storefront/POS prices are tax-inclusive, so PPN is broken out under the
   total figure, not added to it. */
function buildReceipt(order: Order, isWalkIn: boolean): ReceiptData {
  const subtotal = order.lines.reduce((sum, l) => sum + Number(l.price) * Number(l.quantity), 0);
  const discount = order.lines.reduce((sum, l) => sum + Number(l.discountAmount ?? 0), 0);
  const ppn = Math.round(Number(order.amount) - Number(order.amount) / 1.11);

  const summary: ReceiptData['summary'] = [{ label: 'Subtotal', value: subtotal }];
  if (discount > 0) summary.push({ label: 'Discount', value: discount, kind: 'discount' });

  const payment: ReceiptData['payment'] = order.payments.length
    ? order.payments.map(p => ({ label: 'Payment', value: p.method }))
    : [{ label: 'Payment', value: order.paymentStatus === 'Unpaid' ? 'Awaiting settlement' : 'Paid' }];
  payment.push({ label: 'Channel', value: channelLabel(order.tag) || 'POS' });

  return {
    address: ['Jl. Senopati No. 42, Kebayoran Baru', `Jakarta Selatan · ${order.outlet ?? 'MF Store'}`],
    number: order.number,
    datetime: fmtStamp(order.date),
    customer: isWalkIn ? undefined : customerLabel(order.customerName) || undefined,
    lines: order.lines.map(l => ({
      name: l.name,
      meta: [fmtFormat(l.release?.format), l.code, `×${Number(l.quantity)}`].filter(Boolean).join(' · '),
      amount: Number(l.sales ?? Number(l.price) * Number(l.quantity)),
    })),
    summary,
    total: Number(order.amount),
    totalNote: `Incl. PPN 11% · ${fmtIdr(ppn)}`,
    payment,
    footer: ['Terima kasih — thank you', 'Goods sold are not returnable · Keep this receipt'],
  };
}

/* ─── shared card chrome ──────────────────────────────────────────────────
   Panel/section header bar per v2.1 recipe: solid raised bar + ink text.
   Kept local (not shared Panel) so we can align exactly to the mockup. */
function Card({ title, note, children }: { title: string; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] overflow-hidden">
      <header className="flex items-center justify-between gap-2 px-4 py-3 bg-[var(--bg-overlay)] border-b border-[var(--border)]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-primary)]">{title}</span>
        {note != null && <span className="text-[10px] font-mono text-[var(--text-muted)]">{note}</span>}
      </header>
      {children}
    </section>
  );
}

/* ─── payment strip icon by method ────────────────────────────────────── */
function PaymentIcon({ method }: { method: string }) {
  const m = method.toLowerCase();
  if (/qris|xendit|va|virtual/.test(m)) {
    return (
      <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="4" height="4" rx="1" />
        <rect x="18" y="18" width="3" height="3" rx="1" />
      </svg>
    );
  }
  if (/cash|tunai/.test(m)) {
    return (
      <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (id) getOrder(id).then(setOrder).catch(() => setError(true));
  }, [id]);

  if (error) return <p className="text-[12px] text-[var(--danger)]">Order not found.</p>;
  if (!order) return <p className="text-[12px] text-[var(--text-faint)]">Loading…</p>;

  const isWalkIn = !order.tag || /normal|offline|pos|store/i.test(order.tag);
  const subtotal = order.lines.reduce((sum, l) => sum + Number(l.price) * Number(l.quantity), 0);
  const discount = order.lines.reduce((sum, l) => sum + Number(l.discountAmount ?? 0), 0);
  const ppn = Math.round(Number(order.amount) - Number(order.amount) / 1.11);
  const cogs = order.lines.reduce((sum, l) => sum + Number(l.cost ?? 0) * Number(l.quantity), 0);
  const margin = Number(order.amount) - cogs;
  const paidTotal = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const units = order.lines.reduce((sum, l) => sum + Number(l.quantity), 0);
  const rawName = customerLabel(order.customerName);
  const customerName = rawName || 'Walk-in customer';
  const initials = rawName ? initialsOf(rawName) : 'WI';

  const placedIso = order.created ?? order.date;
  const placedStamp = fmtStamp(placedIso);
  const paidStamp = order.payments[0]?.date
    ? fmtPaidRelative(order.payments[0].date, new Date(placedIso))
    : null;

  /* activity log — colored bullets match the mockup's timeline treatment */
  const events: Array<{ title: React.ReactNode; meta: React.ReactNode; kind: 'ok' | 'info' | 'warn' | 'mut' }> = [
    {
      title: <><b className="font-medium">Order placed</b>{isWalkIn ? ' at the register' : ` via ${channelLabel(order.tag)}`}</>,
      meta: <><span className="font-mono">{fmtDateTime(order.created ?? order.date)}</span></>,
      kind: 'info',
    },
    ...order.payments.map(p => ({
      title: <>Payment received — <b className="font-medium">{p.method}</b></>,
      meta: <><span className="font-mono">{fmtIdr(p.amount)} · {fmtDateTime(p.date)}</span></>,
      kind: 'ok' as const,
    })),
    ...(order.fulfillment === 'Partial' || order.fulfillment === 'Sent'
      ? [{
          title: <><b className="font-medium">Fulfilment {order.fulfillment === 'Sent' ? 'complete' : 'in progress'}</b></>,
          meta: <>{order.fulfillment === 'Sent' ? 'handed to courier' : 'packing started'}</>,
          kind: order.fulfillment === 'Sent' ? ('ok' as const) : ('info' as const),
        }]
      : []),
    ...(order.paymentStatus === 'Unpaid'
      ? [{
          title: <>Awaiting settlement</>,
          meta: <>marketplace pays out on its own schedule</>,
          kind: 'warn' as const,
        }]
      : []),
  ];

  const bulletCls: Record<typeof events[number]['kind'], string> = {
    ok: 'bg-[var(--success)]',
    info: 'bg-[var(--info)]',
    warn: 'bg-[var(--warning)]',
    mut: 'bg-[var(--border)]',
  };

  return (
    <div className="max-w-6xl">
      {/* Breadcrumb (chevron style, matches mockup) */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] mb-3">
        <Link to="/orders" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Orders</Link>
        <svg viewBox="0 0 24 24" className="w-3 h-3 text-[var(--text-faint)]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="font-mono text-[var(--text-secondary)]">{order.number}</span>
      </nav>

      {/* Header: number + status + meta line on the left, Receipt on the right */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[24px] font-mono font-medium tracking-[-0.02em] leading-none text-[var(--text-primary)]">
              {order.number}
            </h1>
            <ChannelPill tag={order.tag ?? 'POS'} />
            <StatusPill value={order.paymentStatus} />
            {!isWalkIn && order.fulfillment && <StatusPill value={order.fulfillment} />}
          </div>
          <p className="text-[12px] text-[var(--text-muted)] mt-2.5">
            Placed <span className="font-mono text-[var(--text-secondary)]">{placedStamp}</span>
            {paidStamp && <> · Paid <span className="font-mono text-[var(--text-secondary)]">{paidStamp}</span></>}
            <span> · {order.outlet ?? 'MF Store'}</span>
          </p>
        </div>
        <button
          onClick={() => setShowReceipt(true)}
          className="flex items-center gap-1.5 px-3.5 py-[9px] rounded-[6px] border border-[var(--border)] text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" />
            <path d="M9 7h6M9 11h6M9 15h4" />
          </svg>
          Receipt
        </button>
      </div>

      {/* Lifecycle stepper — marketplace/shipping orders only */}
      {!isWalkIn && (
        <div className="mb-4">
          <LifecycleStepper order={order} />
        </div>
      )}

      {/* Two-column grid — 1fr main / 340px side */}
      <div className="grid grid-cols-[1fr_340px] gap-4 max-lg:grid-cols-1 items-start">
        {/* ── LEFT column ── */}
        <div className="space-y-4">
          {/* Combined card: line items + totals + payment strip */}
          <Card
            title="Line items"
            note={`${order.lines.length} ${order.lines.length === 1 ? 'item' : 'items'} · ${units} ${units === 1 ? 'unit' : 'units'}`}
          >
            {/* Line rows */}
            <div>
              {order.lines.map((line, i) => {
                const artist = line.release?.artist ?? null;
                const title = line.release?.title ?? line.name;
                return (
                  <div
                    key={line.id}
                    className={`flex items-center gap-3.5 px-4 py-3.5 ${i > 0 ? 'border-t border-[var(--border-sub)]' : ''}`}
                  >
                    <span className="w-[52px] h-[52px] rounded-[4px] overflow-hidden border border-[var(--border-sub)] flex-shrink-0">
                      <ReleaseCover imageUrl={line.release?.imageUrl} format={line.release?.format} />
                    </span>
                    <div className="flex-1 min-w-0">
                      {artist && (
                        <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                          {line.release ? (
                            <Link to={`/inventory/${line.release.id}/edit`} className="hover:underline">{artist}</Link>
                          ) : (
                            artist
                          )}
                        </div>
                      )}
                      <div className={`text-[13px] truncate ${artist ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)] font-medium'}`}>
                        {line.release && !artist ? (
                          <Link to={`/inventory/${line.release.id}/edit`} className="hover:underline">{title}</Link>
                        ) : (
                          title
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-[var(--text-muted)] mt-1 flex gap-2 items-center flex-wrap">
                        {line.code && <span>{line.code}</span>}
                        {fmtFormat(line.release?.format) && (
                          <span className="px-1.5 py-[1px] rounded-[3px] border border-[var(--border)] text-[10px] text-[var(--text-secondary)]">
                            {fmtFormat(line.release?.format)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="font-mono text-[12px] text-[var(--text-muted)] w-9 text-center flex-shrink-0">
                      ×{Number(line.quantity)}
                    </div>
                    <div className="font-mono text-[13px] font-medium text-[var(--text-primary)] text-right min-w-[96px] flex-shrink-0">
                      {fmtIdr(line.sales ?? Number(line.price) * Number(line.quantity))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="px-4 py-3.5 border-t border-[var(--border)] space-y-1.5 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Subtotal</span>
                <span className="font-mono text-[var(--text-primary)]">{fmtIdr(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Discount</span>
                  <span className="font-mono text-[var(--text-muted)]">−{fmtIdr(discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">PPN 11% (incl.)</span>
                <span className="font-mono text-[var(--text-muted)]">{fmtIdr(ppn)}</span>
              </div>
              <div className="flex items-center justify-between pt-3 mt-1 border-t border-[var(--border)]">
                <span className="text-[14px] font-semibold text-[var(--text-primary)]">Total</span>
                <span className="font-mono text-[17px] font-medium text-[var(--text-primary)]">{fmtIdr(order.amount)}</span>
              </div>
              {paidTotal > 0 && paidTotal < Number(order.amount) && (
                <p className="text-[11px] text-[var(--warning)] pt-1">
                  Paid {fmtIdr(paidTotal)} of {fmtIdr(order.amount)}.
                </p>
              )}
            </div>

            {/* Payment strip */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-t border-[var(--border)]">
              <div className="w-[34px] h-[34px] rounded-[6px] bg-[var(--bg-overlay)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] flex-shrink-0">
                <PaymentIcon method={order.payments[0]?.method ?? ''} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                  {order.payments[0]?.method
                    ?? (order.paymentStatus === 'Unpaid'
                      ? `Awaiting ${isWalkIn ? 'payment' : 'settlement'}`
                      : 'Payment recorded')}
                </div>
                <div className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5 truncate">
                  {order.payments[0]?.date
                    ? fmtDateTime(order.payments[0].date)
                    : (isWalkIn ? 'check the register in DealPOS' : 'settles via the marketplace')}
                </div>
              </div>
              <StatusPill value={order.paymentStatus} />
            </div>
          </Card>

          {/* Activity log */}
          <Card title="Activity log" note={`${events.length} ${events.length === 1 ? 'event' : 'events'}`}>
            <div className="px-4 py-4">
              {events.map((ev, i) => (
                <div key={i} className="flex gap-3 pb-3.5 last:pb-0 relative">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <span className={`w-2.5 h-2.5 rounded-full mt-1.5 z-[2] ${bulletCls[ev.kind]}`} />
                    {i < events.length - 1 && <span className="flex-1 w-px bg-[var(--border)] mt-1.5" />}
                  </div>
                  <div className="flex-1 min-w-0 pb-0.5">
                    <div className="text-[13px] text-[var(--text-primary)] leading-tight">{ev.title}</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-1">{ev.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── RIGHT column ── */}
        <div className="space-y-4">
          {/* Customer */}
          <Card
            title="Customer"
            note={
              rawName
                ? <Link to={`/customers?q=${encodeURIComponent(rawName)}`} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">View profile →</Link>
                : undefined
            }
          >
            <div className="flex items-center gap-3 p-4">
              <div className="w-[42px] h-[42px] rounded-full bg-[var(--bg-overlay)] border border-[var(--border)] flex items-center justify-center text-[13px] font-semibold text-[var(--text-primary)] flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-medium text-[var(--text-primary)] truncate">{customerName}</div>
                <div className="text-[12px] text-[var(--text-muted)] mt-0.5">
                  {rawName
                    ? (isWalkIn ? 'in-store customer' : `${channelLabel(order.tag) || 'marketplace'} customer`)
                    : 'no account attached — paid at the counter'}
                </div>
              </div>
            </div>
          </Card>

          {/* Sale summary — real business data (COGS, margin) */}
          <Card title="Sale summary">
            <dl className="p-4 space-y-2.5 text-[12px]">
              {[
                ['Channel', channelLabel(order.tag) || 'POS'],
                ['Outlet', order.outlet ?? 'MF Store'],
                ['Items', `${order.lines.length} lines · ${units} units`],
                ['COGS', fmtIdr(cogs)],
                [
                  'Margin',
                  `${fmtIdr(margin)}${Number(order.amount) > 0 ? ` · ${((margin / Number(order.amount)) * 100).toFixed(1)}%` : ''}`,
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <dt className="text-[var(--text-muted)]">{label}</dt>
                  <dd className="font-mono text-[var(--text-primary)] text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>

      {showReceipt && (
        <ReceiptModal
          data={buildReceipt(order, isWalkIn)}
          primary={{ label: 'Done', onClick: () => setShowReceipt(false) }}
          onClose={() => setShowReceipt(false)}
          dismissible
        />
      )}
    </div>
  );
}

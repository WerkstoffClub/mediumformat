import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { channelLabel, customerLabel, fmtDate, fmtIdr, getOrder, type OrderDetail as Order } from '../../api/ops';
import { ChannelPill, Panel, StatusPill, tdCls, thCls } from '../../components/ui/Page';
import { ReleaseCover } from '../../components/ui/Cover';
import { ReceiptModal, type ReceiptData } from '../../components/ui/Receipt';

const fmtTime = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const fmtStamp = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '') : '—';

const fmtFormat = (f?: string | null) =>
  f ? f.replace('TWO_', '2×').replace('THREE_', '3×').replace('TWELVE_INCH', '12"').replace('SEVEN_INCH', '7"').replace('_', ' ') : null;

const MARKETPLACE_STEPS = ['Placed', 'Packed', 'Shipped', 'Delivered', 'Settled'] as const;

/** Step-by-step lifecycle for marketplace/shipping orders (mockup-order-detail).
 *  Marketplace flow: pack → ship → deliver → platform settles the payout.
 *  Every state is inferred from real DealPOS fields (fulfillment + payment). */
function LifecycleStepper({ order }: { order: Order }) {
  if (order.fulfillment === 'Returned') {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--danger)] rounded-[8px] px-4 py-3 flex items-center gap-2 text-[13px] text-[var(--danger)]">
        <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
        Order returned — reversed in DealPOS.
      </div>
    );
  }
  const paid = order.paymentStatus === 'Paid';
  const sent = order.fulfillment === 'Sent';
  const partial = order.fulfillment === 'Partial';
  let reached = 0;              // Placed always done
  if (partial) reached = 1;     // Packed
  if (sent) reached = 2;        // Shipped (handed to courier)
  if (paid) reached = 4;        // Settled — payout implies delivery
  const subtitle = (i: number, done: boolean, current: boolean): string => {
    if (i === 0) return fmtTime(order.created ?? order.date);
    if (i === 4 && paid) return fmtTime(order.payments[0]?.date ?? order.date);
    return done ? '✓' : current ? 'in progress' : '—';
  };
  const fill = (reached / (MARKETPLACE_STEPS.length - 1)) * 100;
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] px-6 py-5">
      <div className="relative flex items-start justify-between">
        <div className="absolute left-0 right-0 top-[13px] h-[1.5px] bg-[var(--border)]" />
        <div className="absolute left-0 top-[13px] h-[1.5px] bg-[var(--accent)] transition-all" style={{ width: `${fill}%` }} />
        {MARKETPLACE_STEPS.map((label, i) => {
          const done = i <= reached;
          const current = i === reached + 1;
          return (
            <div key={label} className="relative z-[2] flex flex-col items-center gap-2 flex-1">
              <span className={`w-[26px] h-[26px] rounded-full border-[1.5px] flex items-center justify-center ${
                done ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-text)]'
                  : current ? 'border-[var(--info)] text-[var(--info)] bg-[var(--info-t)]'
                    : 'border-[var(--border)] text-[var(--text-muted)] bg-[var(--bg-surface)]'}`}>
                {done
                  ? <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
              </span>
              <span className={`text-[12px] font-medium text-center whitespace-nowrap ${done || current ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{label}</span>
              <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">{subtitle(i, done, current)}</span>
            </div>
          );
        })}
      </div>
      {order.paymentStatus === 'Unpaid' && (
        <p className="text-[11px] text-[var(--warning)] mt-3">Awaiting settlement — {channelLabel(order.tag) || 'the marketplace'} pays out on its own schedule.</p>
      )}
    </div>
  );
}

/** Map an order onto the shared receipt shape. Storefront/POS prices are
 *  tax-inclusive, so PPN is broken out under the total, not added to it. */
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
  const cogs = order.lines.reduce((sum, l) => sum + Number(l.cost ?? 0) * Number(l.quantity), 0);
  const margin = Number(order.amount) - cogs;
  const paid = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);

  /* timeline from what actually happened: sale created → payments received */
  const events: Array<{ title: string; meta: string; ok: boolean }> = [
    { title: `Sale rung up${isWalkIn ? ' at the register' : ` on ${channelLabel(order.tag)}`}`, meta: fmtTime(order.created ?? order.date), ok: true },
    ...order.payments.map(p => ({
      title: `Payment received — ${p.method}`,
      meta: `${fmtIdr(p.amount)} · ${fmtTime(p.date)}`,
      ok: true,
    })),
    ...(order.paymentStatus === 'Unpaid'
      ? [{ title: 'Awaiting settlement', meta: 'marketplace pays out on its own schedule', ok: false }]
      : []),
  ];

  return (
    <div className="space-y-4 max-w-5xl">
      {/* header — number + state on the left, the total figure leads on the right */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mb-1.5">
            <Link to="/orders" className="hover:text-[var(--text-primary)]">Orders</Link>
            <span className="text-[var(--text-faint)]">/</span>
            <span className="font-mono text-[var(--text-secondary)]">{order.number}</span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[24px] font-semibold tracking-[-0.04em] leading-8 text-[var(--text-primary)] font-mono">{order.number}</h1>
            <ChannelPill tag={order.tag ?? 'POS'} />
            <StatusPill value={order.paymentStatus} />
            {!isWalkIn && <StatusPill value={order.fulfillment} />}
          </div>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">
            {fmtDate(order.date)} · {order.outlet ?? 'MF Store'} · {isWalkIn ? 'in-store sale' : 'marketplace order'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2.5">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Order total</p>
            <p className="font-mono text-[24px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] leading-none mt-1.5">{fmtIdr(order.amount)}</p>
          </div>
          <button
            onClick={() => setShowReceipt(true)}
            className="flex items-center gap-1.5 px-3 py-[7px] rounded-[6px] border border-[var(--border)] text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>
            Receipt
          </button>
        </div>
      </div>

      {/* marketplace/shipping orders get the step-by-step lifecycle stepper */}
      {!isWalkIn && <LifecycleStepper order={order} />}

      <div className="grid grid-cols-[1.6fr_1fr] gap-4 max-md:grid-cols-1 items-start">
        {/* ── main column ── */}
        <div className="space-y-4">
          <Panel title="Items" note={`${order.lines.length} line${order.lines.length === 1 ? '' : 's'}`}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--bg-overlay)]">
                  {['Item', 'Qty', 'Price', 'Disc.', 'Net'].map(h => <th key={h} className={thCls}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {order.lines.map(line => (
                  <tr key={line.id} className="border-b border-[var(--border-sub)]">
                    <td className={tdCls}>
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="w-9 h-9 rounded-[6px] flex-shrink-0 overflow-hidden border border-[var(--border-sub)]">
                          <ReleaseCover imageUrl={line.release?.imageUrl} format={line.release?.format} />
                        </span>
                        <span className="min-w-0">
                          {line.release ? (
                            <Link to={`/inventory/${line.release.id}/edit`} className="block text-[var(--text-primary)] hover:underline truncate max-w-[280px]">{line.name}</Link>
                          ) : (
                            <span className="block text-[var(--text-primary)] truncate max-w-[280px]">{line.name}</span>
                          )}
                          {line.code && <span className="block font-mono text-[10px] text-[var(--text-muted)]">{line.code}</span>}
                        </span>
                      </span>
                    </td>
                    <td className={`${tdCls} font-mono text-right`}>{Number(line.quantity)}</td>
                    <td className={`${tdCls} font-mono text-right whitespace-nowrap`}>{fmtIdr(line.price)}</td>
                    <td className={`${tdCls} font-mono text-right whitespace-nowrap ${Number(line.discountAmount) > 0 ? 'text-[var(--warning)]' : 'text-[var(--text-faint)]'}`}>
                      {Number(line.discountAmount) > 0 ? `−${fmtIdr(line.discountAmount)}` : '—'}
                    </td>
                    <td className={`${tdCls} font-mono text-right whitespace-nowrap text-[var(--text-primary)]`}>{fmtIdr(line.sales ?? line.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* totals — no shipping rows: this is an over-the-counter sale */}
            <div className="px-3.5 py-3 space-y-1.5 text-[12px]">
              <div className="flex justify-between text-[var(--text-secondary)]"><span>Subtotal</span><span className="font-mono">{fmtIdr(subtotal)}</span></div>
              {discount > 0 && <div className="flex justify-between text-[var(--warning)]"><span>Discount</span><span className="font-mono">−{fmtIdr(discount)}</span></div>}
              <div className="flex justify-between text-[14px] font-semibold text-[var(--text-primary)] pt-1.5 border-t border-[var(--border-sub)]">
                <span>Total</span><span className="font-mono">{fmtIdr(order.amount)}</span>
              </div>
            </div>
          </Panel>

          <Panel title="Payment" note={order.paymentStatus ?? undefined}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--bg-overlay)]">
                  {['Method', 'When', 'Amount'].map(h => <th key={h} className={thCls}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {order.payments.length === 0 && (
                  <tr><td colSpan={3} className={`${tdCls} text-[var(--text-faint)]`}>
                    No payment recorded — {isWalkIn ? 'check the register in DealPOS' : 'settles via the marketplace'}.
                  </td></tr>
                )}
                {order.payments.map(p => (
                  <tr key={p.id} className="border-b border-[var(--border-sub)] last:border-b-0">
                    <td className={`${tdCls} text-[var(--text-primary)]`}>{p.method}</td>
                    <td className={`${tdCls} text-[var(--text-muted)]`}>{fmtTime(p.date)}</td>
                    <td className={`${tdCls} font-mono text-right whitespace-nowrap text-[var(--text-primary)]`}>{fmtIdr(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {paid > 0 && paid < Number(order.amount) && (
              <p className="px-3.5 py-2 text-[11px] text-[var(--warning)]">Paid {fmtIdr(paid)} of {fmtIdr(order.amount)}.</p>
            )}
          </Panel>
        </div>

        {/* ── side column ── */}
        <div className="space-y-4">
          <Panel title="Customer">
            <div className="p-3.5">
              <p className="text-[14px] font-medium text-[var(--text-primary)]">{customerLabel(order.customerName) || 'Walk-in customer'}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                {order.customerName
                  ? <Link to={`/customers?q=${encodeURIComponent(order.customerName)}`} className="underline hover:text-[var(--text-primary)]">View profile →</Link>
                  : 'no account attached — paid at the counter'}
              </p>
            </div>
          </Panel>

          <Panel title="Sale summary">
            <div className="p-3.5 space-y-2 text-[12px]">
              {[
                ['Channel', channelLabel(order.tag) || 'POS'],
                ['Outlet', order.outlet ?? 'MF Store'],
                ['Items', String(order.lines.reduce((sum, l) => sum + Number(l.quantity), 0))],
                ['COGS', fmtIdr(cogs)],
                ['Margin', `${fmtIdr(margin)}${Number(order.amount) > 0 ? ` · ${((margin / Number(order.amount)) * 100).toFixed(1)}%` : ''}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <span className="text-[var(--text-muted)]">{label}</span>
                  <span className="font-mono text-right text-[var(--text-primary)]">{value}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Timeline">
            <div className="p-3.5 space-y-0">
              {events.map((ev, i) => (
                <div key={i} className="flex gap-3 pb-3.5 last:pb-0 relative">
                  {i < events.length - 1 && <span className="absolute left-[7px] top-4 bottom-0 w-px bg-[var(--border)]" />}
                  <span className={`w-[15px] h-[15px] rounded-full border-2 flex-shrink-0 mt-0.5 ${ev.ok ? 'bg-[var(--success-t)] border-[var(--success)]' : 'bg-[var(--warning-t)] border-[var(--warning)]'}`} />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] text-[var(--text-primary)] leading-tight">{ev.title}</span>
                    <span className="block text-[11px] text-[var(--text-muted)] mt-0.5">{ev.meta}</span>
                  </span>
                </div>
              ))}
            </div>
          </Panel>
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

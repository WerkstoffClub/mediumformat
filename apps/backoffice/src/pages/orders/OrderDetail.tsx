import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fmtDate, fmtIdr, getOrder, type OrderDetail as Order } from '../../api/ops';
import { ChannelPill, Panel, StatusPill, tdCls, thCls } from '../../components/ui/Page';
import { ReleaseCover } from '../../components/ui/Cover';

const fmtTime = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

/** Simple printable receipt for a walk-in sale (black-on-white, like the barcode label). */
function printReceipt(order: Order) {
  const win = window.open('', 'mf-receipt', 'width=380,height=640');
  if (!win) return;
  const lines = order.lines.map(l =>
    `<tr><td>${l.name}</td><td class="n">${Number(l.quantity)}×</td><td class="n">${fmtIdr(l.sales ?? l.price)}</td></tr>`).join('');
  const pays = order.payments.map(p => `<tr><td>${p.method}</td><td class="n" colspan="2">${fmtIdr(p.amount)}</td></tr>`).join('');
  win.document.write(`<!doctype html><title>Receipt ${order.number}</title>
  <style>
    body{font-family:"Geist Mono",monospace;font-size:11px;color:#000;background:#fff;padding:18px;max-width:300px;margin:0 auto}
    h1{font-family:"Geist",sans-serif;font-size:14px;text-align:center;margin:0 0 2px}
    .sub{text-align:center;color:#555;margin-bottom:12px}
    table{width:100%;border-collapse:collapse}
    td{padding:3px 0;vertical-align:top}
    .n{text-align:right;white-space:nowrap}
    .rule td{border-top:1px dashed #000;padding:0;height:8px}
    .tot td{font-weight:700;font-size:12px}
    .foot{text-align:center;margin-top:14px;color:#555}
  </style>
  <h1>Medium Format</h1>
  <div class="sub">${order.number} · ${fmtDate(order.date)}${order.customerName ? ` · ${order.customerName}` : ''}</div>
  <table>
    ${lines}
    <tr class="rule"><td colspan="3"></td></tr>
    <tr class="tot"><td>Total</td><td class="n" colspan="2">${fmtIdr(order.amount)}</td></tr>
    ${pays}
  </table>
  <div class="foot">Terima kasih! · mediumformat.info</div>
  <script>setTimeout(()=>window.print(),150)</script>`);
  win.document.close();
}

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState(false);

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
    { title: `Sale rung up${isWalkIn ? ' at the register' : ` on ${order.tag}`}`, meta: fmtTime(order.created ?? order.date), ok: true },
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
      {/* header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mb-1">
            <Link to="/orders" className="hover:text-[var(--text-primary)]">Orders</Link>
            <span className="text-[var(--text-faint)]">/</span>
            <span className="font-mono text-[var(--text-primary)]">{order.number}</span>
          </div>
          <h1 className="text-[24px] font-semibold tracking-[-0.04em] leading-8 text-[var(--text-primary)] font-mono">{order.number}</h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            {fmtDate(order.date)} · {order.outlet ?? 'MF Store'} · {isWalkIn ? 'in-store sale' : 'marketplace order'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ChannelPill tag={order.tag ?? 'POS'} />
          <StatusPill value={order.paymentStatus} />
          {!isWalkIn && <StatusPill value={order.fulfillment} />}
          <button
            onClick={() => printReceipt(order)}
            className="flex items-center gap-1.5 px-3 py-[7px] rounded-[6px] border border-[var(--border)] text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.6}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print receipt
          </button>
        </div>
      </div>

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
              <p className="text-[14px] font-medium text-[var(--text-primary)]">{order.customerName || 'Walk-in customer'}</p>
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
                ['Channel', order.tag ?? 'POS'],
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
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fmtDate, fmtIdr, getOrder, type OrderDetail as Order } from '../../api/ops';
import { ChannelPill, Panel, StatusPill, tdCls, thCls } from '../../components/ui/Page';

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (id) getOrder(id).then(setOrder).catch(() => setError(true));
  }, [id]);

  if (error) return <p className="text-[12px] text-[var(--danger)]">Order not found.</p>;
  if (!order) return <p className="text-[12px] text-[var(--text-faint)]">Loading…</p>;

  const cogs = order.lines.reduce((sum, l) => sum + Number(l.cost ?? 0) * Number(l.quantity), 0);
  const margin = Number(order.amount) - cogs;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mb-1">
            <Link to="/orders" className="hover:text-[var(--text-primary)]">Orders</Link>
            <span className="text-[var(--text-faint)]">/</span>
            <span className="font-mono text-[var(--text-primary)]">{order.number}</span>
          </div>
          <h1 className="text-[18px] font-black tracking-tight text-[var(--text-primary)] font-mono">{order.number}</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {fmtDate(order.date)} · {order.outlet ?? '—'} · {order.customerName || 'Walk-in'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ChannelPill tag={order.tag} />
          <StatusPill value={order.paymentStatus} />
          <StatusPill value={order.fulfillment} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {[
          ['Total', fmtIdr(order.amount)],
          ['COGS', fmtIdr(cogs)],
          ['Margin', fmtIdr(margin)],
        ].map(([label, value]) => (
          <div key={label} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3.5 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1">{label}</p>
            <p className="text-[15px] font-bold font-mono text-[var(--text-primary)]">{value}</p>
          </div>
        ))}
      </div>

      <Panel title="Items" note={`${order.lines.length} lines`}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              {['Item', 'SKU', 'Qty', 'Price', 'Discount', 'Net sales'].map(h => <th key={h} className={thCls}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {order.lines.map(line => (
              <tr key={line.id} className="border-b border-[var(--border-sub)]">
                <td className={`${tdCls} text-[var(--text-primary)]`}>{line.name}</td>
                <td className={`${tdCls} font-mono text-[var(--text-muted)]`}>{line.code ?? '—'}</td>
                <td className={`${tdCls} font-mono text-right`}>{Number(line.quantity)}</td>
                <td className={`${tdCls} font-mono text-right whitespace-nowrap`}>{fmtIdr(line.price)}</td>
                <td className={`${tdCls} font-mono text-right whitespace-nowrap`}>{line.discountAmount ? fmtIdr(line.discountAmount) : '—'}</td>
                <td className={`${tdCls} font-mono text-right whitespace-nowrap text-[var(--text-primary)]`}>{fmtIdr(line.sales ?? line.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Payments" note={`${order.payments.length} received`}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              {['Method', 'Date', 'Amount', 'Note'].map(h => <th key={h} className={thCls}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {order.payments.length === 0 && (
              <tr><td colSpan={4} className={`${tdCls} text-[var(--text-faint)]`}>No payment records on this order.</td></tr>
            )}
            {order.payments.map(p => (
              <tr key={p.id} className="border-b border-[var(--border-sub)]">
                <td className={`${tdCls} text-[var(--text-primary)]`}>{p.method}</td>
                <td className={`${tdCls} text-[var(--text-muted)]`}>{fmtDate(p.date)}</td>
                <td className={`${tdCls} font-mono text-right whitespace-nowrap`}>{fmtIdr(p.amount)}</td>
                <td className={`${tdCls} text-[var(--text-muted)]`}>{p.note ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

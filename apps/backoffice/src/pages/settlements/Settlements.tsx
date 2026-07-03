import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPayments, type PaymentRow } from '../../api/finance';
import { channelColor, fmtDate, fmtIdr, getOrders, type OrderRow } from '../../api/ops';
import { ChannelPill, PageHeader, Panel, tdCls, thCls } from '../../components/ui/Page';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const MARKETPLACE = /tiktok|shopee|tokopedia/i;

/** Marketplace money: what the platforms still owe, and what already settled. */
export function Settlements() {
  const [unpaid, setUnpaid] = useState<OrderRow[]>([]);
  const [unpaidTotal, setUnpaidTotal] = useState(0);
  const [recentPayments, setRecentPayments] = useState<PaymentRow[]>([]);

  useEffect(() => {
    getOrders({ payment: 'Unpaid', limit: 100 }).then(r => { setUnpaid(r.data); setUnpaidTotal(r.total); }).catch(() => {});
    const to = iso(new Date());
    const from = iso(new Date(Date.now() - 29 * 86400000));
    getPayments({ from, to })
      .then(rows => setRecentPayments(rows.filter(p => MARKETPLACE.test(p.method))))
      .catch(() => {});
  }, []);

  const byChannel = useMemo(() => {
    const groups = new Map<string, { count: number; sum: number }>();
    for (const o of unpaid) {
      const key = o.tag ?? 'Untagged';
      const g = groups.get(key) ?? { count: 0, sum: 0 };
      groups.set(key, { count: g.count + 1, sum: g.sum + Number(o.amount) });
    }
    return [...groups.entries()].sort((a, b) => b[1].sum - a[1].sum);
  }, [unpaid]);

  const outstanding = unpaid.reduce((sum, o) => sum + Number(o.amount), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settlements"
        sub={`Marketplace payouts — ${unpaidTotal} order${unpaidTotal === 1 ? '' : 's'} awaiting settlement, ${fmtIdr(outstanding)} outstanding`}
      />

      <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
        {byChannel.map(([tag, g]) => (
          <div key={tag} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full" style={{ background: channelColor(tag) }} />
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">{tag}</h3>
            </div>
            <p className="text-[18px] font-bold font-mono text-[var(--text-primary)]">{fmtIdr(g.sum)}</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">{g.count} order{g.count === 1 ? '' : 's'} awaiting payout</p>
          </div>
        ))}
        {byChannel.length === 0 && (
          <p className="text-[11px] text-[var(--text-faint)] col-span-3">Nothing outstanding — all marketplace orders are settled.</p>
        )}
      </div>

      <Panel title="Awaiting settlement" note={unpaidTotal > unpaid.length ? `showing ${unpaid.length} of ${unpaidTotal}` : `${unpaid.length} orders`}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              {['Order', 'Date', 'Channel', 'Amount'].map(h => <th key={h} className={thCls}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {unpaid.length === 0 && <tr><td colSpan={4} className={`${tdCls} text-[var(--text-faint)]`}>Nothing awaiting settlement.</td></tr>}
            {unpaid.map(o => (
              <tr key={o.id} className="border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)]">
                <td className={tdCls}><Link to={`/orders/${o.id}`} className="font-mono text-[var(--text-primary)] hover:underline">{o.number}</Link></td>
                <td className={`${tdCls} text-[var(--text-muted)] whitespace-nowrap`}>{fmtDate(o.date)}</td>
                <td className={tdCls}><ChannelPill tag={o.tag} /></td>
                <td className={`${tdCls} font-mono text-right whitespace-nowrap text-[var(--text-primary)]`}>{fmtIdr(o.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Settled via marketplace balance — last 30 days">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              {['Method', 'Transactions', 'Amount'].map(h => <th key={h} className={thCls}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {recentPayments.length === 0 && <tr><td colSpan={3} className={`${tdCls} text-[var(--text-faint)]`}>No marketplace settlements in the last 30 days.</td></tr>}
            {recentPayments.map(p => (
              <tr key={p.method} className="border-b border-[var(--border-sub)]">
                <td className={`${tdCls} text-[var(--text-primary)]`}>{p.method}</td>
                <td className={`${tdCls} font-mono text-right`}>{p.count}</td>
                <td className={`${tdCls} font-mono text-right whitespace-nowrap text-[var(--text-primary)]`}>{fmtIdr(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

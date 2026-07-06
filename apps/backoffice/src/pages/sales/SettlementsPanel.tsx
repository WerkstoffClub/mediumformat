import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPayments, type PaymentRow } from '../../api/finance';
import { channelColor, channelLabel, fmtDate, fmtIdr, getOrders, type OrderRow } from '../../api/ops';
import { ChannelPill, Panel, tdCls, thCls } from '../../components/ui/Page';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const MARKETPLACE = /tiktok|shopee|tokopedia/i;

/** Marketplace money: what the platforms still owe, and what already settled.
 *  Lives as the "Settlements" tab inside Sales — same data, no page chrome. */
export function SettlementsPanel() {
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
  const chMax = Math.max(...byChannel.map(([, g]) => g.sum), 1);

  return (
    <div className="space-y-3.5">
      {/* Outstanding banner — the one number that matters here, sized to lead */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] px-5 py-4 flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Outstanding payouts</p>
          <p className="font-mono text-[28px] font-medium tracking-[-0.02em] text-[var(--text-primary)] leading-none mt-2">{fmtIdr(outstanding)}</p>
        </div>
        <p className="text-[12px] text-[var(--text-muted)]">
          {unpaidTotal} order{unpaidTotal === 1 ? '' : 's'} awaiting settlement across {byChannel.length} channel{byChannel.length === 1 ? '' : 's'}
        </p>
      </div>

      {/* Per-channel breakdown with share bars, not identical cards */}
      <Panel title="Awaiting payout by channel" note={byChannel.length ? `${byChannel.length} channels` : undefined}>
        <div className="p-4 space-y-3.5">
          {byChannel.length === 0 && (
            <p className="text-[11px] text-[var(--text-faint)]">Nothing outstanding — every marketplace order is settled.</p>
          )}
          {byChannel.map(([tag, g]) => (
            <div key={tag}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-primary)]">
                  <span className="w-2 h-2 rounded-full" style={{ background: channelColor(tag) }} />{channelLabel(tag)}
                  <span className="text-[10px] text-[var(--text-muted)]">· {g.count} order{g.count === 1 ? '' : 's'}</span>
                </span>
                <span className="font-mono text-[12px] text-[var(--text-primary)]">{fmtIdr(g.sum)}</span>
              </div>
              <span className="block h-[6px] rounded-full bg-[var(--neutral-t)] overflow-hidden">
                <span className="block h-full rounded-full" style={{ width: `${(g.sum / chMax) * 100}%`, background: channelColor(tag) }} />
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Awaiting settlement" note={unpaidTotal > unpaid.length ? `showing ${unpaid.length} of ${unpaidTotal}` : `${unpaid.length} orders`}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              {['Order', 'Date', 'Channel', 'Amount'].map(h => <th key={h} className={h === 'Amount' ? `${thCls} text-right` : thCls}>{h}</th>)}
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

      <Panel title="Settled via marketplace balance" note="last 30 days">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              {['Method', 'Transactions', 'Amount'].map(h => <th key={h} className={h === 'Method' ? thCls : `${thCls} text-right`}>{h}</th>)}
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

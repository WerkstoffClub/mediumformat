import { useEffect, useState } from 'react';
import { channelColor, fmtDate, fmtIdr, getChannels, type ChannelSummary } from '../../api/ops';
import { PageHeader, Panel, tdCls, thCls } from '../../components/ui/Page';

export function Channels() {
  const [data, setData] = useState<ChannelSummary | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => { getChannels().then(setData).catch(() => setError(true)); }, []);

  const totalRevenue = data?.channels.reduce((sum, c) => sum + c.revenue, 0) ?? 0;

  return (
    <div className="space-y-4">
      <PageHeader title="Channels" sub="Where sales come from — the Tag on every DealPOS invoice" />
      {error && <p className="text-[12px] text-[var(--danger)]">Could not load channel data.</p>}

      <div className="grid grid-cols-3 gap-3">
        {data?.channels.map(channel => (
          <div key={channel.tag} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full" style={{ background: channelColor(channel.tag) }} />
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">{channel.tag}</h3>
            </div>
            <p className="text-[18px] font-bold font-mono text-[var(--text-primary)]">{fmtIdr(channel.revenue)}</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              {channel.orders} orders · {totalRevenue > 0 ? ((channel.revenue / totalRevenue) * 100).toFixed(1) : 0}% of revenue
            </p>
            <p className="text-[10px] text-[var(--text-faint)] mt-2">Last order {fmtDate(channel.lastOrderAt)}</p>
          </div>
        ))}
        {data && data.channels.length === 0 && (
          <p className="text-[11px] text-[var(--text-faint)] col-span-3">No channel data yet — run a DealPOS sync.</p>
        )}
      </div>

      <Panel title="Payment methods" note="configured in DealPOS">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              {['Method', 'Type', 'Status'].map(h => <th key={h} className={thCls}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {data?.paymentMethods.map(m => (
              <tr key={m.id} className="border-b border-[var(--border-sub)]">
                <td className={`${tdCls} text-[var(--text-primary)]`}>{m.name}</td>
                <td className={`${tdCls} font-mono text-[var(--text-muted)]`}>{m.type ?? '—'}</td>
                <td className={`${tdCls} ${m.suspended ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
                  {m.suspended ? 'Suspended' : 'Active'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

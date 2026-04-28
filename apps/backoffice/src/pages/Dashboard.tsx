import { useEffect, useState } from 'react';
import { getReleases } from '../api/inventory';

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3.5 py-2.5">
      <p className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1">{label}</p>
      <p className="text-[20px] font-black text-[var(--text-primary)] leading-none">{value}</p>
      {sub && <p className="text-[9px] mt-1 text-[var(--text-faint)]">{sub}</p>}
    </div>
  );
}

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-[var(--border-sub)]">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          {title}
        </h3>
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const [stockCount, setStockCount] = useState<number | null>(null);
  const now = new Date();
  const weekNum = Math.ceil(
    (now.getDate() - now.getDay() + 6) / 7,
  );

  useEffect(() => {
    getReleases({ limit: 1 })
      .then(r => setStockCount(r.total))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[18px] font-black tracking-tight text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Welcome back — here's what's happening today</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Week {weekNum}</p>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            {now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
          <p className="text-[26px] font-black text-[var(--text-primary)] leading-none mt-1">
            {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-2.5">
        <StatCard label="Today's Revenue"  value="Rp 0"  sub="No orders yet" />
        <StatCard label="Open Orders"      value="0" />
        <StatCard label="Items in Stock"   value={stockCount ?? '—'} sub={stockCount != null ? `${stockCount} releases` : 'Loading...'} />
        <StatCard label="This Month"       value="Rp 0" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Widget title="Sales over time">
            <div className="h-28 flex items-center justify-center text-[11px] text-[var(--text-faint)]">
              Sales data will appear once orders are placed
            </div>
          </Widget>
        </div>

        <Widget title="Eshop Visitors">
          <div className="text-center py-4">
            <p className="text-[28px] font-black text-[var(--text-primary)]">—</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Connect analytics to track visitors</p>
          </div>
        </Widget>

        <div className="col-span-2">
          <Widget title="Recent Orders">
            <p className="text-[11px] text-[var(--text-faint)] py-2">No orders yet.</p>
          </Widget>
        </div>

        <Widget title="Sales by Channel">
          <p className="text-[11px] text-[var(--text-faint)] py-2">No data yet.</p>
        </Widget>
      </div>
    </div>
  );
}

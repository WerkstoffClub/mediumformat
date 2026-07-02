import { channelColor } from '../../api/ops';

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h1 className="text-[18px] font-black tracking-tight text-[var(--text-primary)]">{title}</h1>
        {sub && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Panel({ title, note, actions, children }: {
  title: string; note?: string; actions?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-[var(--border-sub)] flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">{title}</h3>
        <div className="flex items-center gap-2">
          {note && <span className="text-[10px] text-[var(--text-faint)]">{note}</span>}
          {actions}
        </div>
      </div>
      {children}
    </div>
  );
}

/** v2.1 channel indicator — coloured dot + text on a neutral pill. */
export function ChannelPill({ tag }: { tag: string | null }) {
  if (!tag) return <span className="text-[10px] text-[var(--text-faint)]">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)] whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: channelColor(tag) }} />
      {tag}
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  Paid: 'var(--success)', Sent: 'var(--success)', Received: 'var(--success)',
  Partial: 'var(--warning)', Unpaid: 'var(--danger)', Unsent: 'var(--warning)',
  Returned: 'var(--danger)', Draft: 'var(--text-muted)',
};

export function StatusPill({ value }: { value: string | null }) {
  if (!value) return <span className="text-[10px] text-[var(--text-faint)]">—</span>;
  const color = STATUS_COLORS[value] ?? 'var(--text-muted)';
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] whitespace-nowrap" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {value}
    </span>
  );
}

export const thCls = 'text-left px-3.5 py-2 text-[9px] uppercase tracking-[0.07em] text-[var(--text-faint)] font-semibold border-b border-[var(--border-sub)] whitespace-nowrap';
export const tdCls = 'px-3.5 py-2.5 text-[11.5px]';

export function SearchBox({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-3 py-1.5 flex-1 max-w-xs">
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[var(--text-faint)] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input
        className="bg-transparent text-[11px] outline-none text-[var(--text-primary)] placeholder:text-[var(--text-faint)] w-full"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

export function Paginator({ page, limit, total, shown, onPage }: {
  page: number; limit: number; total: number; shown: number; onPage: (p: number) => void;
}) {
  return (
    <div className="flex items-center px-3.5 py-2 border-t border-[var(--border-sub)] text-[10px] text-[var(--text-faint)] gap-2">
      <span>Showing {shown > 0 ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)} of {total}</span>
      <div className="flex-1" />
      <button disabled={page === 1} onClick={() => onPage(page - 1)} className="px-2 py-0.5 border border-[var(--border)] rounded disabled:opacity-30">‹</button>
      <button disabled={page * limit >= total} onClick={() => onPage(page + 1)} className="px-2 py-0.5 border border-[var(--border)] rounded disabled:opacity-30">›</button>
    </div>
  );
}

export function EmptyRow({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <tr><td colSpan={cols} className="px-3.5 py-8 text-center text-[11px] text-[var(--text-faint)]">{children}</td></tr>
  );
}

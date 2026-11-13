import { channelColor, channelLabel } from '../../api/ops';

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.04em] leading-8 text-[var(--text-primary)]">{title}</h1>
        {sub && <p className="text-[13px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
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
      {channelLabel(tag)}
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  Paid: 'var(--success)', Sent: 'var(--success)', Received: 'var(--success)',
  Partial: 'var(--warning)', Unpaid: 'var(--danger)', Unsent: 'var(--warning)',
  Returned: 'var(--danger)', Draft: 'var(--text-muted)', Cancelled: 'var(--danger)',
  // Imports (ImportStatus) — Received/Draft/Cancelled reuse the entries above.
  Submitted: 'var(--info)', Consolidated: 'var(--info)', Priced: 'var(--info)',
  'Inventory updated': 'var(--success)',
  // Imports (ImportLineMatchStatus) — per-line match result from POST /imports/:id/match.
  Matched: 'var(--success)', New: 'var(--info)', Ambiguous: 'var(--warning)',
  // Forwarder consolidations (ConsolidationStatus) — open until freight is allocated.
  Open: 'var(--info)', Allocated: 'var(--success)',
  // Web orders (storefront checkout)
  'Awaiting payment': 'var(--warning)', Shipped: 'var(--info)', Completed: 'var(--success)',
  // Newsletter
  Scheduled: 'var(--warning)', Active: 'var(--success)', Unsubscribed: 'var(--text-muted)',
  // Peers (venues, shows, tickets) + Dealers
  Live: 'var(--success)', Onboarding: 'var(--warning)', Paused: 'var(--text-muted)', Prospect: 'var(--text-muted)',
  'On sale': 'var(--success)', 'Sold out': 'var(--info)', Ended: 'var(--text-muted)',
  Valid: 'var(--success)', Void: 'var(--danger)', 'Checked in': 'var(--info)', Refunded: 'var(--danger)',
  'Already checked in': 'var(--warning)', 'Wrong event': 'var(--danger)', 'Not a ticket code': 'var(--danger)',
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

export interface TabDef { key: string; label: string; count?: number | null; }

/** Page-level tab bar — underline style, distinct from filter pills and panel headers. */
export function Tabs({ tabs, active, onChange }: { tabs: TabDef[]; active: string; onChange: (key: string) => void }) {
  return (
    <div role="tablist" className="flex items-center gap-0.5 border-b border-[var(--border)] mb-4 overflow-x-auto">
      {tabs.map(t => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            className={`relative -mb-px flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors ${
              on
                ? 'border-[var(--accent)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {t.label}
            {t.count != null && (
              <span className={`font-mono text-[11px] ${on ? 'text-[var(--text-secondary)]' : 'text-[var(--text-faint)]'}`}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

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

/** KPI card — mockup summary strip (label · big mono figure · delta line). */
export function Stat({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] px-[18px] py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--text-muted)]">{label}</p>
      <p className="font-mono text-[24px] font-medium tracking-[-0.02em] text-[var(--text-primary)] leading-none mt-2.5">{value}</p>
      {children && <p className="text-[12px] text-[var(--text-secondary)] mt-2.5 flex items-center gap-1.5">{children}</p>}
    </div>
  );
}

/** Panel with a labelled header bar — mockup "CUSTOMER LIST" style. */
export function Widget({ title, note, actions, children }: { title: string; note?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] overflow-hidden">
      <div className="flex items-center justify-between gap-2.5 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-overlay)]">
        <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--text-primary)]">{title}</span>
        <div className="flex items-center gap-2">
          {note && <span className="text-[11px] font-mono text-[var(--text-muted)]">{note}</span>}
          {actions}
        </div>
      </div>
      {children}
    </div>
  );
}

/** Mockup `.channel-tag` (v2.1): neutral 4px-radius tag, small square dot in
 *  the channel colour. Takes an already-resolved channel label or a raw tag. */
export function ChannelTag({ channel, empty = '—' }: { channel: string | null | undefined; empty?: string }) {
  if (!channel) return <span className="text-[11px] text-[var(--text-faint)]">{empty}</span>;
  return (
    <span className="inline-flex items-center gap-[5px] text-[11px] px-2 py-0.5 rounded-[4px] border border-[var(--border)] text-[var(--text-secondary)] whitespace-nowrap">
      <span className="w-[5px] h-[5px] rounded-[1.5px] flex-shrink-0" style={{ background: channelColor(channel) }} />
      {channelLabel(channel)}
    </span>
  );
}

/** Page numbers to show: 1 2 3 … 129 (with the current page kept visible). */
function pageList(page: number, pages: number): Array<number | '…'> {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, 2, 3, page - 1, page, page + 1, pages].filter(p => p >= 1 && p <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: Array<number | '…'> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

/** Mockup `.mf-foot` table footer: "1–10 of 1.284 customers" + numbered pager. */
export function TableFoot({ page, limit, total, noun, note, onPage }: {
  page: number; limit: number; total: number; noun: string; note?: string; onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total > 0 ? (page - 1) * limit + 1 : 0;
  const to = Math.min(page * limit, total);
  const nf = new Intl.NumberFormat('id-ID');
  const btn = 'min-w-[30px] h-[30px] px-2 rounded-[6px] border text-[12px] [font-variant-numeric:tabular-nums] transition-colors';
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-t border-[var(--border)]">
      <span className="text-[12px] text-[var(--text-secondary)] [font-variant-numeric:tabular-nums]">
        {nf.format(from)}–{nf.format(to)} of {nf.format(total)} {noun}{note ? ` · ${note}` : ''}
      </span>
      <div className="flex gap-1" role="navigation" aria-label="Pagination">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}
          className={`${btn} border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] disabled:opacity-40 disabled:cursor-not-allowed`}>‹</button>
        {pageList(page, pages).map((p, i) =>
          p === '…' ? (
            <button key={`gap${i}`} type="button" disabled className={`${btn} border-[var(--border)] text-[var(--text-secondary)] opacity-40`}>…</button>
          ) : (
            <button key={p} type="button" aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)}
              className={`${btn} ${p === page
                ? 'border-[var(--accent)] text-[var(--text-primary)] bg-[var(--bg-overlay)]'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]'}`}>
              {nf.format(p)}
            </button>
          ),
        )}
        <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)}
          className={`${btn} border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] disabled:opacity-40 disabled:cursor-not-allowed`}>›</button>
      </div>
    </div>
  );
}

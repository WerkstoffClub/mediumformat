import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  channelColor, channelLabel, customerLabel, fmtDate, fmtIdr, fmtIdrCompact,
  getCustomerDetail, type CustomerDetail,
} from '../../api/ops';
import { StatusPill } from '../../components/ui/Page';

const ANIM_MS = 220;

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '—';

function Stat({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-muted)]">{label}</p>
      <p className="font-mono text-[18px] font-medium text-[var(--text-primary)] mt-1 truncate" title={title ?? value}>{value}</p>
    </div>
  );
}

export function CustomerDrawer({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  // Latest onClose without re-subscribing the key handler on every render.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const close = useCallback(() => { setOpen(false); setTimeout(() => onCloseRef.current(), ANIM_MS); }, []);

  // Slide in on mount; slide out before unmounting.
  useEffect(() => {
    const t = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Fetch on customer change; ignore a stale response if the id changed first.
  useEffect(() => {
    let active = true;
    setDetail(null);
    setError(false);
    getCustomerDetail(customerId)
      .then(d => { if (active) setDetail(d); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [customerId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const name = detail ? customerLabel(detail.name) : '';
  const chMax = Math.max(...(detail?.channels.map(c => c.revenue) ?? [1]), 1);

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={close}
      />
      {/* panel */}
      <aside
        role="dialog"
        aria-label="Customer detail"
        className={`absolute right-0 top-0 h-full w-full max-w-[440px] bg-[var(--bg-surface)] border-l border-[var(--border)] shadow-[0_8px_24px_rgba(0,0,0,.6)] flex flex-col transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-[var(--border)]">
          <span className="w-11 h-11 rounded-full bg-[var(--bg-overlay)] border border-[var(--border)] flex items-center justify-center font-mono text-[14px] font-medium text-[var(--text-primary)] flex-shrink-0">
            {detail ? initials(name) : '·'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-semibold text-[var(--text-primary)] truncate">{detail ? name : 'Loading…'}</h2>
              {detail?.segment && (
                <span className={`text-[10px] font-semibold uppercase tracking-[0.04em] px-[7px] py-px rounded-[4px] border ${
                  detail.segment === 'vip' ? 'text-[var(--text-primary)] border-[var(--accent)]' : 'text-[var(--text-muted)] border-[var(--border)]'
                }`}>
                  {detail.segment === 'vip' ? 'VIP' : 'New'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 font-mono">
              {detail?.code ?? '—'}{detail?.joinDate ? ` · member since ${new Date(detail.joinDate).getFullYear()}` : ''}
            </p>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && <p className="px-5 py-6 text-[12px] text-[var(--danger)]">Could not load this customer.</p>}
          {!error && !detail && <p className="px-5 py-6 text-[12px] text-[var(--text-faint)]">Loading…</p>}

          {detail && (
            <div className="divide-y divide-[var(--border)]">
              {/* contact */}
              <div className="px-5 py-4 space-y-1.5">
                {[
                  ['Email', detail.email],
                  ['Phone', detail.mobile],
                  ['First order', fmtDate(detail.firstOrderAt)],
                  ['Last order', fmtDate(detail.lastOrderAt)],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="text-[var(--text-muted)]">{k}</span>
                    <span className={`text-right truncate ${k === 'Email' || k === 'Phone' ? 'font-mono text-[11px]' : ''} text-[var(--text-primary)]`}>{v || '—'}</span>
                  </div>
                ))}
              </div>

              {/* headline figures */}
              <div className="px-5 py-4 flex gap-2">
                <Stat label="Lifetime" value={fmtIdrCompact(detail.lifetime)} title={fmtIdr(detail.lifetime)} />
                <Stat label="Orders" value={String(detail.orders)} />
                <Stat label="Avg order" value={fmtIdrCompact(detail.avgOrder)} title={fmtIdr(detail.avgOrder)} />
              </div>

              {/* channel mix */}
              {detail.channels.length > 0 && (
                <div className="px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)] mb-3">Channel mix</p>
                  <div className="space-y-2.5">
                    {detail.channels.map(c => (
                      <div key={c.tag}>
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-primary)] min-w-0">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: channelColor(c.tag) }} />
                            <span className="truncate">{channelLabel(c.tag) || 'Untagged'}</span>
                            <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">· {c.orders}</span>
                          </span>
                          <span className="font-mono text-[12px] text-[var(--text-primary)] flex-shrink-0">{fmtIdrCompact(c.revenue)}</span>
                        </div>
                        <span className="block h-[5px] rounded-full bg-[var(--neutral-t)] overflow-hidden">
                          <span className="block h-full rounded-full" style={{ width: `${(c.revenue / chMax) * 100}%`, background: channelColor(c.tag) }} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* recent orders */}
              <div className="px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)] mb-2">Recent orders</p>
                {detail.recentOrders.length === 0 && <p className="text-[11px] text-[var(--text-faint)]">No orders on record.</p>}
                <div className="flex flex-col -mx-2">
                  {detail.recentOrders.map(o => (
                    <Link
                      key={o.id}
                      to={`/orders/${o.id}`}
                      className="flex items-center gap-3 px-2 py-2 rounded-[6px] hover:bg-[var(--bg-overlay)] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[12px] text-[var(--text-primary)] truncate">{o.number}</span>
                          <StatusPill value={o.paymentStatus} />
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          {fmtDate(o.date)} · {o.lines} item{o.lines === 1 ? '' : 's'}{o.tag ? ` · ${channelLabel(o.tag)}` : ''}
                        </p>
                      </div>
                      <span className="font-mono text-[12px] text-[var(--text-primary)] flex-shrink-0">{fmtIdrCompact(o.amount)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

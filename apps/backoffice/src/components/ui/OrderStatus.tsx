import type { OrderStatus } from '../../api/ops';

/** One back-office status per order (DealPOS or MF), mockup-orders colours. */
export const ORDER_STATUS: Record<OrderStatus, { label: string; color: string; tint: string }> = {
  pending: { label: 'Pending', color: 'var(--warning)', tint: 'var(--warning-t)' },
  processing: { label: 'Processing', color: 'var(--info)', tint: 'var(--info-t)' },
  packed: { label: 'Packed', color: 'var(--info)', tint: 'var(--info-t)' },
  shipped: { label: 'Shipped', color: 'var(--info)', tint: 'var(--info-t)' },
  delivered: { label: 'Delivered', color: 'var(--success)', tint: 'var(--success-t)' },
  completed: { label: 'Completed', color: 'var(--success)', tint: 'var(--success-t)' },
  cancelled: { label: 'Cancelled', color: 'var(--danger)', tint: 'var(--danger-t)' },
  returned: { label: 'Returned', color: 'var(--danger)', tint: 'var(--danger-t)' },
};

export function OrderStatusPill({ status }: { status: OrderStatus | null | undefined }) {
  if (!status) return <span className="text-[11px] text-[var(--text-faint)]">—</span>;
  const s = ORDER_STATUS[status];
  return (
    <span
      className="inline-flex items-center gap-[5px] text-[11px] font-medium px-[9px] py-0.5 rounded-full whitespace-nowrap tracking-[0.01em]"
      style={{ background: s.tint, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

/** Mockup `.seg` badge: neutral, VIP outlined in the accent. */
export function SegmentBadge({ segment }: { segment: 'wholesale' | 'vip' | 'new' | null | undefined }) {
  if (!segment) return null;
  const vip = segment === 'vip';
  return (
    <span
      className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.04em] px-[7px] py-px rounded-[4px] border ${
        vip ? 'text-[var(--text-primary)] border-[var(--accent)]' : 'text-[var(--text-muted)] border-[var(--border)]'
      }`}
    >
      {segment === 'vip' ? 'VIP' : segment === 'wholesale' ? 'Wholesale' : 'New'}
    </span>
  );
}

/** Channels staff can pick for a back-office customer or order. */
export const ENTRY_CHANNELS = ['WhatsApp', 'Instagram', 'Phone', 'POS', 'Website', 'Tokopedia', 'Shopee', 'Discogs', 'Bandcamp', 'Event', 'Wholesale'];

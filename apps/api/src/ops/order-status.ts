import type { OrderTracking, TrackingStage } from '@prisma/client';

/** One back-office status per order, whichever system it came from.
 *  DealPOS invoice: returned → returned; MF tracking stage (packed / shipped /
 *  delivered) when recorded; unpaid/partial → pending (awaiting payment or
 *  marketplace settlement); unsent → processing; else completed.
 *  MF order: cancelled / completed from its own status, then tracking, then
 *  PENDING → pending, SHIPPED → shipped, PAID → processing.
 *  The SQL in OpsService.inboxCte applies the same rules. */
export const ORDER_STATUSES = [
  'pending', 'processing', 'packed', 'shipped', 'delivered', 'completed', 'cancelled', 'returned',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type Segment = 'wholesale' | 'vip' | 'new' | null;

/** Wholesale is a business relationship and wins over the value-based tags. */
export function customerSegment(
  c: { wholesale: boolean; lifetime: number; isNew: boolean },
  vipCutoff: number,
): Segment {
  if (c.wholesale) return 'wholesale';
  if (c.lifetime >= vipCutoff) return 'vip';
  if (c.isNew) return 'new';
  return null;
}

const ORDER: TrackingStage[] = ['PACKED', 'SHIPPED', 'DELIVERED'];

/** Timestamps for a move to `stage`: stamps that stage and any earlier stage
 *  not stamped yet; keeps earlier stamps; clears later ones (moving back). */
export function trackingTimes(
  stage: TrackingStage,
  prev: Pick<OrderTracking, 'packedAt' | 'shippedAt' | 'deliveredAt'> | null,
  now: Date,
) {
  const at = ORDER.indexOf(stage);
  const keep = (i: number, v: Date | null | undefined) => (i <= at ? v ?? now : null);
  return {
    packedAt: keep(0, prev?.packedAt),
    shippedAt: keep(1, prev?.shippedAt),
    deliveredAt: keep(2, prev?.deliveredAt),
  };
}

import { customerSegment, trackingTimes } from './order-status';

describe('customerSegment', () => {
  const vip = 5_000_000;
  it('puts wholesale ahead of VIP and new', () => {
    expect(customerSegment({ wholesale: true, lifetime: 9e6, isNew: true }, vip)).toBe('wholesale');
    expect(customerSegment({ wholesale: false, lifetime: 9e6, isNew: true }, vip)).toBe('vip');
    expect(customerSegment({ wholesale: false, lifetime: 1e5, isNew: true }, vip)).toBe('new');
    expect(customerSegment({ wholesale: false, lifetime: 1e5, isNew: false }, vip)).toBeNull();
  });
});

describe('trackingTimes', () => {
  const t0 = new Date('2026-11-01T10:00:00Z');
  const now = new Date('2026-11-03T10:00:00Z');
  it('stamps skipped earlier stages when jumping ahead', () => {
    expect(trackingTimes('SHIPPED', null, now)).toEqual({ packedAt: now, shippedAt: now, deliveredAt: null });
  });
  it('keeps earlier stamps and clears later ones when moving back', () => {
    const prev = { packedAt: t0, shippedAt: t0, deliveredAt: t0 };
    expect(trackingTimes('PACKED', prev, now)).toEqual({ packedAt: t0, shippedAt: null, deliveredAt: null });
    expect(trackingTimes('DELIVERED', { packedAt: t0, shippedAt: null, deliveredAt: null }, now))
      .toEqual({ packedAt: t0, shippedAt: now, deliveredAt: now });
  });
});

import { validateVoucher } from './vouchers.validator';

const now = new Date('2026-07-12T00:00:00Z');

describe('validateVoucher', () => {
  const base = {
    id: 'v',
    code: 'X',
    kind: 'PERCENT' as const,
    value: 10,
    minOrderIdr: 0,
    startsAt: null,
    expiresAt: null,
    usageLimit: null,
    usageCount: 0,
    active: true,
  };

  it('rejects inactive', () => {
    expect(validateVoucher({ ...base, active: false }, 100_000, now)).toEqual({
      valid: false,
      discountIdr: 0,
      reason: 'inactive',
    });
  });

  it('applies percent discount', () => {
    expect(validateVoucher(base, 100_000, now)).toEqual({
      valid: true,
      discountIdr: 10_000,
    });
  });

  it('applies fixed idr, capped to subtotal', () => {
    expect(
      validateVoucher({ ...base, kind: 'FIXED_IDR', value: 200_000 }, 50_000, now),
    ).toEqual({ valid: true, discountIdr: 50_000 });
  });

  it('rejects below min order', () => {
    expect(
      validateVoucher({ ...base, minOrderIdr: 100_000 }, 50_000, now),
    ).toEqual({ valid: false, discountIdr: 0, reason: 'below_minimum' });
  });

  it('rejects past expiry', () => {
    expect(
      validateVoucher(
        { ...base, expiresAt: new Date('2026-07-11T00:00:00Z') },
        100_000,
        now,
      ),
    ).toEqual({ valid: false, discountIdr: 0, reason: 'expired' });
  });

  it('rejects before start', () => {
    expect(
      validateVoucher(
        { ...base, startsAt: new Date('2026-07-13T00:00:00Z') },
        100_000,
        now,
      ),
    ).toEqual({ valid: false, discountIdr: 0, reason: 'not_started' });
  });

  it('rejects at usage limit', () => {
    expect(
      validateVoucher(
        { ...base, usageLimit: 5, usageCount: 5 },
        100_000,
        now,
      ),
    ).toEqual({ valid: false, discountIdr: 0, reason: 'limit_reached' });
  });
});

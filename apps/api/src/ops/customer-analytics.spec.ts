import { fillMonths, lastMonths } from './customer-analytics';

describe('customer analytics helpers', () => {
  const now = new Date(Date.UTC(2026, 1, 15)); // Feb 2026

  it('lists the last N months oldest first, crossing the year boundary', () => {
    expect(lastMonths(3, now)).toEqual(['2025-12', '2026-01', '2026-02']);
  });

  it('zero-fills months with no data and keeps provided values', () => {
    const out = fillMonths([{ month: '2026-01', newCustomers: 4, revenue: 100 }], 3, now);
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual({ month: '2025-12', newCustomers: 0, activeCustomers: 0, returningCustomers: 0, revenue: 0 });
    expect(out[1]).toMatchObject({ month: '2026-01', newCustomers: 4, revenue: 100, activeCustomers: 0 });
  });

  it('ignores rows outside the window', () => {
    const out = fillMonths([{ month: '2020-01', newCustomers: 9 }], 2, now);
    expect(out.every(p => p.newCustomers === 0)).toBe(true);
  });
});

/** Pure helpers for the customer analytics view (kept out of the service so they unit-test without a DB). */

export interface MonthPoint {
  month: string; // YYYY-MM
  newCustomers: number;
  activeCustomers: number;
  returningCustomers: number;
  revenue: number;
}

export const monthKey = (d: Date): string =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

/** The last `count` month keys ending at `now`'s month, oldest first. */
export function lastMonths(count: number, now: Date): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - i), 1));
    return monthKey(d);
  });
}

/** Zero-fill a sparse month series so charts get one point per month. */
export function fillMonths(
  rows: ReadonlyArray<Partial<MonthPoint> & { month: string }>,
  count: number,
  now: Date,
): MonthPoint[] {
  const byMonth = new Map(rows.map(r => [r.month, r]));
  return lastMonths(count, now).map(month => {
    const r = byMonth.get(month);
    return {
      month,
      newCustomers: r?.newCustomers ?? 0,
      activeCustomers: r?.activeCustomers ?? 0,
      returningCustomers: r?.returningCustomers ?? 0,
      revenue: r?.revenue ?? 0,
    };
  });
}

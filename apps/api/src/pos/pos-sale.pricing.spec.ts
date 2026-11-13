import { posSaleNumber, saleTotals } from './pos-sale.pricing';

describe('saleTotals', () => {
  it('adds PPN 11% on the subtotal when there is no discount', () => {
    expect(saleTotals(485_000, null)).toEqual({ subtotalIdr: 485_000, discountIdr: 0, taxIdr: 53_350, totalIdr: 538_350 });
  });

  it('charges PPN on the discounted subtotal (fixed and percent)', () => {
    expect(saleTotals(500_000, { kind: 'FIXED_IDR', value: 50_000 })).toEqual({ subtotalIdr: 500_000, discountIdr: 50_000, taxIdr: 49_500, totalIdr: 499_500 });
    expect(saleTotals(500_000, { kind: 'PERCENT', value: 10 }).discountIdr).toBe(50_000);
  });

  it('caps discounts at the subtotal and percent at 100', () => {
    expect(saleTotals(100_000, { kind: 'FIXED_IDR', value: 250_000 }).totalIdr).toBe(0);
    expect(saleTotals(100_000, { kind: 'PERCENT', value: 150 }).discountIdr).toBe(100_000);
  });

  it('lets a validated voucher replace the manual discount', () => {
    expect(saleTotals(400_000, { kind: 'PERCENT', value: 50 }, 25_000).discountIdr).toBe(25_000);
  });
});

describe('posSaleNumber', () => {
  it('uses the WIB date and a POS prefix', () => {
    expect(posSaleNumber(new Date('2026-11-13T18:30:00Z'), () => 0)).toBe('POS-261114-AAAAA');
  });
});

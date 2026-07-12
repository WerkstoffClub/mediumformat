import { reconcileLine, reconcileTotals } from './reconcile';

describe('reconcileLine', () => {
  it('accepts exact products', () => {
    expect(reconcileLine({ qty: 2, unitPrice: 24.75, extended: 49.5 })).toBe(true);
  });
  it('tolerates vendor rounding (2 × 4.52 shown as 9.05)', () => {
    expect(reconcileLine({ qty: 2, unitPrice: 4.52, extended: 9.05 })).toBe(true);
  });
  it('rejects a real mismatch', () => {
    expect(reconcileLine({ qty: 2, unitPrice: 24.75, extended: 60.0 })).toBe(false);
  });
});

describe('reconcileTotals', () => {
  it('accepts subtotal+shipping ≈ invoiceTotal within tolerance', () => {
    expect(reconcileTotals({ extendedSum: 1390.16, vendorShipping: 179.16, invoiceTotal: 1569.32 })).toBe(true);
  });
  it('accepts when invoiceTotal is unknown', () => {
    expect(reconcileTotals({ extendedSum: 100, vendorShipping: 5, invoiceTotal: undefined })).toBe(true);
  });
  it('rejects a large discrepancy', () => {
    expect(reconcileTotals({ extendedSum: 100, vendorShipping: 5, invoiceTotal: 200 })).toBe(false);
  });
});

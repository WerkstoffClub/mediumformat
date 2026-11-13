/** Pure totals for a POS sale. Prices come from the DB, never the client. */

export const POS_TAX_RATE = 0.11; // PPN, matches the register ("PPN 11%")

export type ManualDiscount = { kind: 'PERCENT' | 'FIXED_IDR'; value: number } | null | undefined;

export interface SaleTotals {
  subtotalIdr: number;
  discountIdr: number;
  taxIdr: number;
  totalIdr: number;
}

/**
 * A validated voucher wins over a manual discount (the register replaces the
 * discount with the voucher's amount). PPN is charged on the discounted subtotal.
 */
export function saleTotals(subtotalIdr: number, discount: ManualDiscount, voucherDiscountIdr?: number | null): SaleTotals {
  let raw = 0;
  if (voucherDiscountIdr != null) raw = voucherDiscountIdr;
  else if (discount) {
    raw = discount.kind === 'PERCENT'
      ? Math.round(subtotalIdr * (Math.min(100, Math.max(0, discount.value)) / 100))
      : discount.value;
  }
  const discountIdr = Math.min(subtotalIdr, Math.max(0, Math.round(raw)));
  const taxable = subtotalIdr - discountIdr;
  const taxIdr = Math.round(taxable * POS_TAX_RATE);
  return { subtotalIdr, discountIdr, taxIdr, totalIdr: taxable + taxIdr };
}

/** POS-YYMMDD-XXXXX (WIB date) — distinct from web orders' MF- prefix. */
export function posSaleNumber(now: Date, rand: () => number = Math.random): string {
  const d = new Date(now.getTime() + 7 * 3600_000);
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, '');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let tail = '';
  for (let i = 0; i < 5; i++) tail += alphabet[Math.floor(rand() * alphabet.length)];
  return `POS-${ymd}-${tail}`;
}

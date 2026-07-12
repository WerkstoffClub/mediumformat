const LINE_TOLERANCE = 0.05;      // absolute currency units; covers vendor per-line rounding
const TOTAL_TOLERANCE_RATIO = 0.01; // 1% of invoice total

export function reconcileLine(l: { qty: number; unitPrice: number; extended: number }): boolean {
  return Math.abs(l.qty * l.unitPrice - l.extended) <= LINE_TOLERANCE;
}

export function reconcileTotals(t: {
  extendedSum: number;
  vendorShipping: number;
  invoiceTotal?: number;
}): boolean {
  if (t.invoiceTotal == null) return true; // can't check; not a failure
  const tol = Math.max(0.05, t.invoiceTotal * TOTAL_TOLERANCE_RATIO);
  return Math.abs(t.extendedSum + t.vendorShipping - t.invoiceTotal) <= tol;
}

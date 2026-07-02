import { PageHeader } from '../../components/ui/Page';

/** Design-complete shell — the voucher engine ships with the storefront checkout. */
export function Vouchers() {
  return (
    <div>
      <PageHeader title="Vouchers" sub="Discount codes for the storefront and POS" />
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-6 py-14 text-center">
        <div className="w-10 h-10 mx-auto mb-3 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
          <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/></svg>
        </div>
        <p className="text-[13px] font-semibold text-[var(--text-primary)]">No vouchers yet</p>
        <p className="text-[11px] text-[var(--text-muted)] mt-1 max-w-[42ch] mx-auto">
          Voucher creation goes live together with the storefront checkout — codes, validity
          windows, minimum spend and usage limits, exactly as designed in the prototype.
        </p>
      </div>
    </div>
  );
}

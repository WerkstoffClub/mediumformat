import { PageHeader } from '../../components/ui/Page';

/** Design-complete shell — preorders ship with the storefront checkout. */
export function Preorders() {
  return (
    <div>
      <PageHeader title="Preorders" sub="Upcoming releases customers can commit to before arrival" />
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] px-6 py-14 text-center">
        <div className="w-10 h-10 mx-auto mb-3 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
          <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M20 12v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8"/><rect x="2" y="7" width="20" height="5" rx="1"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
        </div>
        <p className="text-[13px] font-semibold text-[var(--text-primary)]">No preorders yet</p>
        <p className="text-[11px] text-[var(--text-muted)] mt-1 max-w-[46ch] mx-auto">
          Preorder campaigns (cutoff dates, committed units, deposits) go live with the
          storefront checkout — as designed in the prototype. Until then, incoming stock
          is tracked in Purchase Orders.
        </p>
      </div>
    </div>
  );
}

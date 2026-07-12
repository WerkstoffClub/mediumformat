import type { ReactNode } from 'react';
import type { ConsolidationStatus } from '../../api/consolidations';

export const inputCls =
  'w-full bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[6px] px-3 py-[9px] text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]';

export const CONSOLIDATION_STATUS_LABEL: Record<ConsolidationStatus, string> = {
  open: 'Open',
  allocated: 'Allocated',
};

export function Field({
  label, required, children, htmlFor,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-[0.04em] mb-1.5"
      >
        {label}
        {required && <span className="text-[var(--danger)] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

/** Extracts a readable message from an axios error, following NewImport's
 *  onParse catch convention — surfaces the API's validation/rejection text
 *  (e.g. "Only international orders can be consolidated") instead of a
 *  generic failure string. */
export const apiErrorMessage = (err: unknown, fallback: string): string => {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : (msg ?? fallback);
};

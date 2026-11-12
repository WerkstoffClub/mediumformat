import { useEffect, useState } from 'react';
import type { NewsletterSource } from '../../api/newsletter';

export type ToastFn = (kind: 'ok' | 'err', text: string) => void;

export const SOURCE_LABEL: Record<NewsletterSource, string> = {
  STOREFRONT: 'Storefront',
  CHECKOUT:   'Checkout',
  POS:        'POS',
  MANUAL:     'Manual',
  IMPORT:     'Import',
};

/** Mockup table cells — 13px rows, 11px uppercase headers. */
export const th = 'text-left px-4 pt-[11px] pb-[9px] text-[11px] uppercase tracking-[0.04em] text-[var(--text-muted)] font-semibold whitespace-nowrap';
export const td = 'px-4 py-3 text-[13px] text-[var(--text-secondary)] border-t border-[var(--border)] align-middle';

export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

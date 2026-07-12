import type { ReactNode } from 'react';
import type { ImportLineMatchStatus, ImportOrigin, ImportRecordFormat, ImportStatus, PaymentMethod } from '../../api/imports';

export const inputCls =
  'w-full bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[6px] px-3 py-[9px] text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]';

/* API expects the Prisma enum values; labels follow the prototype (see
   apps/backoffice/src/pages/inventory/release-edit/shared.tsx FORMATS). */
export const FORMATS: ReadonlyArray<readonly [ImportRecordFormat, string]> = [
  ['LP', 'LP'], ['TWO_LP', '2×LP'], ['THREE_LP', '3×LP'], ['TWELVE_INCH', '12" single'],
  ['SEVEN_INCH', '7" single'], ['CD', 'CD'], ['TWO_CD', '2×CD'], ['CASSETTE', 'Cassette'], ['MERCH', 'Merch'],
];

export const fmtFormat = (f?: string | null) =>
  ({ TWO_LP: '2×LP', THREE_LP: '3×LP', TWELVE_INCH: '12"', SEVEN_INCH: '7"', TWO_CD: '2×CD' } as Record<string, string>)[f ?? ''] ?? f ?? null;

export const ORIGIN_LABEL: Record<ImportOrigin, string> = {
  INTERNATIONAL: 'International',
  DOMESTIC: 'Domestic',
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CREDIT_CARD: 'Credit card',
  BANK_TRANSFER: 'Bank transfer',
  PAYPAL: 'PayPal',
  CASH: 'Cash',
  OTHER: 'Other',
};

/** Stable display order for the Channel pricing table — mirrors
 *  packages/shared/src/constants/imports.ts SalesChannel enum. */
export const CHANNEL_ORDER = ['POS', 'WEBSITE', 'TOKOPEDIA', 'SHOPEE', 'DISCOGS'] as const;

export const CHANNEL_LABEL: Record<(typeof CHANNEL_ORDER)[number], string> = {
  POS: 'POS',
  WEBSITE: 'Website',
  TOKOPEDIA: 'Tokopedia',
  SHOPEE: 'Shopee',
  DISCOGS: 'Discogs',
};

export const IMPORT_STATUS_LABEL: Record<ImportStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  CONSOLIDATED: 'Consolidated',
  PRICED: 'Priced',
  RECEIVED: 'Received',
  INVENTORY_UPDATED: 'Inventory updated',
  CANCELLED: 'Cancelled',
};

/** Per-line match result from POST /imports/:id/match — label feeds StatusPill,
 *  which colors it via STATUS_COLORS['Matched'|'New'|'Ambiguous']. */
export const MATCH_STATUS_LABEL: Record<ImportLineMatchStatus, string> = {
  MATCHED: 'Matched',
  NEW: 'New',
  AMBIGUOUS: 'Ambiguous',
};

/** Native-currency figure (vendor invoices are USD/EUR/GBP/etc, not IDR) — falls
 *  back to a plain grouped number if the currency code isn't recognised by Intl. */
export const fmtNative = (v: string | number | null | undefined, currency: string | undefined): string => {
  const n = Number(v ?? 0);
  if (!currency) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }
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

/** DESIGN.md v2.1 `mf-panel-hdr` recipe: solid accent bar (black bar / white text
 *  in light theme, inverted in dark). Applies to panel/section headers only. */
export function PanelHeader({
  number, title, note, children,
}: {
  number: number | string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[8px] border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
      <div className="mf-panel-hdr flex items-center gap-3 px-4 py-2.5 bg-[var(--accent)] text-[var(--accent-text)]">
        <span
          className="inline-flex items-center justify-center w-5 h-5 text-[11px] font-semibold rounded-full bg-[var(--accent-text)] text-[var(--accent)] [font-variant-numeric:tabular-nums]"
          aria-hidden="true"
        >
          {number}
        </span>
        <h2 className="text-[13px] font-semibold tracking-[0.02em] flex-1">{title}</h2>
        {note && <span className="text-[11px] font-normal opacity-80 whitespace-nowrap normal-case">{note}</span>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

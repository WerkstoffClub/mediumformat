import type { ReactNode } from 'react';

export const inputCls =
  'w-full bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[6px] px-3 py-[9px] text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]';

/* API expects the Prisma enum values; labels follow the prototype */
export const FORMATS = [
  ['LP', 'LP'], ['TWO_LP', '2×LP'], ['THREE_LP', '3×LP'], ['TWELVE_INCH', '12" single'],
  ['SEVEN_INCH', '7" single'], ['CD', 'CD'], ['TWO_CD', '2×CD'], ['CASSETTE', 'Cassette'], ['MERCH', 'Merch'],
] as const;

export const CONDITIONS = [
  ['M', 'M'], ['VGP', 'VG+'], ['VG', 'VG'], ['GP', 'G+'], ['G', 'G'], ['F', 'F'], ['P', 'P'],
] as const;

export const LOCATIONS = [
  ['MAIN_STORE', 'Main Store'], ['WAREHOUSE', 'Warehouse'], ['CONSIGNMENT', 'Consignment'],
] as const;

export const CHANNELS = [
  ['website', 'Website', 'goes live with the storefront'],
  ['pos', 'POS', 'in-store'],
  ['tokopedia', 'Tokopedia', 'via marketplace listing'],
  ['shopee', 'Shopee', 'via marketplace listing'],
  ['discogs', 'Discogs', 'not connected yet'],
] as const;

export const condLabel = (c?: string | null) =>
  c === 'VGP' ? 'VG+' : c === 'GP' ? 'G+' : c ?? null;

export const fmtFormat = (f?: string | null) =>
  ({ TWO_LP: '2×LP', THREE_LP: '3×LP', TWELVE_INCH: '12"', SEVEN_INCH: '7"', TWO_CD: '2×CD' } as Record<
    string,
    string
  >)[f ?? ''] ?? f ?? null;

export function Field({
  label,
  required,
  children,
  htmlFor,
  aiButton,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
  aiButton?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor={htmlFor}
          className="block text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-[0.04em]"
        >
          {label}
          {required && <span className="text-[var(--danger)] ml-0.5">*</span>}
        </label>
        {aiButton}
      </div>
      {children}
    </div>
  );
}

export function AiButton({
  busy,
  onClick,
  small,
}: {
  busy: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-1 rounded-[5px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] disabled:opacity-50 transition-colors ${small ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-1'}`}
    >
      <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
        <path d="M12 2l1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7z" />
      </svg>
      {busy ? '…' : 'AI assist'}
    </button>
  );
}

export function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-[23px] rounded-full border flex-shrink-0 transition-colors ${
        checked ? 'bg-[var(--accent)] border-[var(--accent)]' : 'bg-[var(--bg-overlay)] border-[var(--border)]'
      }`}
    >
      <span
        className={`absolute top-[3px] left-[3px] w-[15px] h-[15px] rounded-full transition-transform ${
          checked ? 'translate-x-[17px] bg-[var(--accent-text)]' : 'bg-[var(--text-muted)]'
        }`}
      />
    </button>
  );
}

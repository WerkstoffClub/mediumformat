import { type ReactNode, useEffect } from 'react';

interface ModalShellProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
  /** Tailwind width class; defaults to `max-w-[560px]`. */
  widthClass?: string;
}

/**
 * Lightweight centered modal — the drawer chrome from PurchaseOrderDrawer felt
 * too heavy for a lookup dialog. Escape and backdrop click both close.
 */
export function ModalShell({
  title,
  subtitle,
  onClose,
  footer,
  children,
  widthClass = 'max-w-[560px]',
}: ModalShellProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-label={title}
        className={`relative w-full ${widthClass} bg-[var(--bg-surface)] border border-[var(--border)] rounded-[10px] shadow-[0_16px_48px_rgba(0,0,0,.5)] flex flex-col max-h-[calc(100vh-2rem)]`}
      >
        <div className="mf-panel-hdr flex items-start gap-3 px-4 py-2.5 bg-[var(--accent)] text-[var(--accent-text)] rounded-t-[10px]">
          <div className="min-w-0 flex-1">
            <h2 className="text-[13px] font-semibold tracking-[0.02em] truncate">{title}</h2>
            {subtitle && (
              <p className="text-[11px] opacity-80 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-6 h-6 rounded-[5px] flex items-center justify-center opacity-80 hover:opacity-100 flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

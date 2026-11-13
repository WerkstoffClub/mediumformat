import { useCallback, useEffect, useRef, useState } from 'react';

const ANIM_MS = 220;

export const inputCls =
  'w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]';
export const btnPrimary =
  'whitespace-nowrap text-[12px] px-3 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40';
export const btnGhost =
  'whitespace-nowrap text-[12px] px-3 py-2 rounded-[6px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors disabled:opacity-40';

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.05em] text-[var(--text-muted)] mb-1">{label}</span>
      {children}
    </label>
  );
}

/** Drawer section with the v2.1 accent panel header bar. */
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-4 mb-4 border border-[var(--border)] rounded-[8px] overflow-hidden">
      <div className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-text)] text-[11px] font-semibold uppercase tracking-[0.08em]">{title}</div>
      <div className="p-4 space-y-3 bg-[var(--bg-surface)]">{children}</div>
    </section>
  );
}

/** Pill toggle group for enum fields. */
export function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap bg-[var(--bg-surface)] border border-[var(--border)] rounded-[6px] p-[3px]">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`text-[11px] font-medium px-3 py-1 rounded-[4px] transition-colors ${
            value === o.value ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Right-side sheet: slide-in, Esc / backdrop closes. `close` is passed to the footer. */
export function Drawer({ eyebrow, title, onClose, footer, children }: {
  eyebrow: string;
  title: string;
  onClose: () => void;
  footer?: (close: () => void) => React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const close = useCallback(() => {
    setOpen(false);
    setTimeout(() => onCloseRef.current(), ANIM_MS);
  }, []);
  useEffect(() => {
    const t = requestAnimationFrame(() => setOpen(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(t); window.removeEventListener('keydown', onKey); };
  }, [close]);

  return (
    <div className="fixed inset-0 z-50">
      <div className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={close} />
      <aside
        role="dialog"
        aria-label={title}
        className={`absolute right-0 top-0 h-full w-full max-w-[520px] bg-[var(--bg-base)] border-l border-[var(--border)] shadow-[0_8px_24px_rgba(0,0,0,.6)] flex flex-col transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-start gap-3 px-5 py-3.5 border-b border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">{eyebrow}</p>
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mt-1 truncate">{title}</h2>
          </div>
          <button onClick={close} aria-label="Close" className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pt-4">{children}</div>
        {footer && <div className="flex items-center gap-2 px-5 py-3 border-t border-[var(--border)] bg-[var(--bg-surface)]">{footer(close)}</div>}
      </aside>
    </div>
  );
}

/** API error → readable message (Nest returns { message: string | string[] }). */
export function errMsg(e: unknown, fallback = 'Something went wrong.'): string {
  const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(m)) return m.join(' · ');
  return m || fallback;
}

/** Inline toast for a page: [node, show(kind, text)]. */
export function useToast(): [React.ReactNode, (kind: 'ok' | 'err', text: string) => void] {
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const show = useCallback((kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(t => (t?.text === text ? null : t)), 4000);
  }, []);
  const node = toast ? (
    <div role="status" className={`mb-3 text-[12px] px-3 py-2 rounded-[6px] border ${
      toast.kind === 'ok' ? 'border-[var(--success)] bg-[var(--success-t)] text-[var(--success)]' : 'border-[var(--danger)] bg-[var(--danger-t)] text-[var(--danger)]'
    }`}>{toast.text}</div>
  ) : null;
  return [node, show];
}

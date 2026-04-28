type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';

const styles: Record<Variant, string> = {
  success: 'bg-[var(--success)]/10 text-[var(--success)]',
  warning: 'bg-[var(--warning)]/10 text-[var(--warning)]',
  danger:  'bg-[var(--danger)]/10  text-[var(--danger)]',
  info:    'bg-[var(--info)]/10    text-[var(--info)]',
  neutral: 'bg-[var(--bg-overlay)] text-[var(--text-muted)]',
  brand:   'bg-[var(--brand-muted)] text-[var(--brand)]',
};

export function Badge({
  children,
  variant = 'neutral',
}: {
  children: React.ReactNode;
  variant?: Variant;
}) {
  return (
    <span className={`inline-block px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wide ${styles[variant]}`}>
      {children}
    </span>
  );
}

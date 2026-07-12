import type { ReactNode } from 'react';

interface PanelHeaderProps {
  number: number | string;
  title: string;
  note?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

/**
 * DESIGN.md v2.1 `mf-panel-hdr` recipe: solid accent bar (black bar / white text
 * in light theme, inverted in dark). Applies to panel/section headers only.
 * The numbered chip inverts back so it reads on the accent surface.
 */
export function PanelHeader({ number, title, note, actions, children }: PanelHeaderProps) {
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
        {note && (
          <span className="text-[11px] font-normal opacity-80 whitespace-nowrap normal-case">
            {note}
          </span>
        )}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

import { PanelHeader } from './PanelHeader';
import { Field } from './shared';
import type { SectionProps } from './types';

const PRICE_ROWS = [
  ['Price', 'priceIdr', true],
  ['Compare-at', 'compareAtIdr', false],
  ['Cost (COGS)', 'costIdr', false],
] as const;

export function Pricing({ value, onChange }: SectionProps) {
  const price = value.priceIdr ?? 0;
  const cost = value.costIdr ?? 0;
  const margin = price && cost ? `${(((price - cost) / price) * 100).toFixed(1)}%` : '—';

  return (
    <PanelHeader number={3} title="Pricing" note="IDR · incl. PPN 11%">
      <div className="grid grid-cols-4 gap-3.5 max-md:grid-cols-2">
        {PRICE_ROWS.map(([label, field, required]) => (
          <Field key={field} label={label} required={required} htmlFor={field}>
            <div className="flex items-center bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[6px] focus-within:border-[var(--accent)]">
              <span className="pl-3 text-[12px] text-[var(--text-muted)]">Rp</span>
              <input
                id={field}
                type="number"
                min={0}
                className="w-full bg-transparent px-2 py-[9px] text-[13px] font-mono text-[var(--text-primary)] outline-none"
                value={(value[field] as number | undefined | null) ?? ''}
                onChange={(e) => onChange({ [field]: Number(e.target.value) || 0 })}
                required={required}
              />
            </div>
          </Field>
        ))}
        <Field label="Margin">
          <div className="px-1 py-[9px] text-[13px] font-mono text-[var(--text-secondary)] [font-variant-numeric:tabular-nums]">
            {margin}
          </div>
        </Field>
      </div>
      {value.compareAtIdr ? (
        <p className="text-[11px] text-[var(--text-muted)] mt-2.5">
          Compare-at shows struck-through on the storefront when On-sale (section 9) is enabled.
        </p>
      ) : null}
    </PanelHeader>
  );
}

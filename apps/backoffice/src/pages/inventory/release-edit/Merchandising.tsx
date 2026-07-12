import { PanelHeader } from './PanelHeader';
import { Field, inputCls, Switch } from './shared';
import type { SectionProps, SizeRow } from './types';

export function Merchandising({ value, onChange }: SectionProps) {
  const sizing: SizeRow[] = value.sizing ?? [];
  const patchSizing = (i: number, patch: Partial<SizeRow>) =>
    onChange({ sizing: sizing.map((row, j) => (j === i ? { ...row, ...patch } : row)) });

  return (
    <PanelHeader number={9} title="Merchandising" note="Storefront placement & promotion">
      <div className="divide-y divide-[var(--border-sub)]">
        <div className="flex items-center gap-4 py-3 first:pt-0.5">
          <div className="flex-1">
            <p className="text-[13px] font-medium text-[var(--text-primary)]">Featured</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Show in the homepage featured slider and category hero placements.
            </p>
          </div>
          <Switch
            checked={value.featured ?? false}
            onChange={(v) => onChange({ featured: v })}
          />
        </div>
        <div className="py-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[var(--text-primary)]">Pre-order</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                List before release with an estimated delivery date shown to customers.
              </p>
            </div>
            <Switch
              checked={value.preorder ?? false}
              onChange={(v) => onChange({ preorder: v })}
            />
          </div>
          {value.preorder && (
            <div className="mt-3 max-w-[240px]">
              <Field label="Estimated delivery" htmlFor="preorder-eta">
                <input
                  id="preorder-eta"
                  type="date"
                  className={`${inputCls} font-mono`}
                  value={value.preorderEta ? String(value.preorderEta).slice(0, 10) : ''}
                  onChange={(e) => onChange({ preorderEta: e.target.value })}
                />
              </Field>
              <p className="text-[10px] text-[var(--text-faint)] mt-1.5">
                Shown as "Pre-order · Ships …" on the release page.
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 py-3 last:pb-0.5">
          <div className="flex-1">
            <p className="text-[13px] font-medium text-[var(--text-primary)]">On-sale</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Enable to show the struck-through Compare-at price (section 3) on the storefront.
            </p>
          </div>
          <Switch checked={value.onSale ?? false} onChange={(v) => onChange({ onSale: v })} />
        </div>
      </div>

      {value.format === 'MERCH' && (
        <div className="mt-5 pt-5 border-t border-[var(--border-sub)]">
          <p className="text-[12px] font-semibold text-[var(--text-primary)] mb-1">Sizing guide</p>
          <p className="text-[11px] text-[var(--text-muted)] mb-2.5">
            Shown on the product page for apparel &amp; merchandise.
          </p>
          <div className="space-y-1.5">
            <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 text-[10px] uppercase tracking-[0.05em] text-[var(--text-muted)] font-medium px-0.5">
              <span>Size</span>
              <span>Chest (cm)</span>
              <span>Length (cm)</span>
              <span />
            </div>
            {sizing.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 items-center">
                <input
                  className={inputCls}
                  value={row.size}
                  onChange={(e) => patchSizing(i, { size: e.target.value })}
                  aria-label="Size"
                />
                <input
                  className={`${inputCls} font-mono`}
                  value={row.chest ?? ''}
                  onChange={(e) => patchSizing(i, { chest: e.target.value })}
                  aria-label="Chest cm"
                />
                <input
                  className={`${inputCls} font-mono`}
                  value={row.length ?? ''}
                  onChange={(e) => patchSizing(i, { length: e.target.value })}
                  aria-label="Length cm"
                />
                <button
                  type="button"
                  onClick={() =>
                    onChange({ sizing: sizing.filter((_, j) => j !== i) })
                  }
                  aria-label="Remove size"
                  className="w-8 h-8 rounded-[5px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => onChange({ sizing: [...sizing, { size: '' }] })}
              className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add size
            </button>
          </div>
        </div>
      )}
    </PanelHeader>
  );
}

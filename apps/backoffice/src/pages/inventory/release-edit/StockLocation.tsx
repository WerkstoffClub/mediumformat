import type { StoreLocation } from '@mf/shared';
import { PanelHeader } from './PanelHeader';
import { Field, inputCls, LOCATIONS } from './shared';
import type { SectionProps } from './types';

export function StockLocation({ value, onChange }: SectionProps) {
  const dims = value.dimensionsMm ?? {};

  return (
    <PanelHeader number={4} title="Stock & location">
      <div className="grid grid-cols-[1fr_120px_100px_110px] gap-3.5 items-end max-md:grid-cols-2">
        <Field label="Location" htmlFor="loc">
          <select
            id="loc"
            className={inputCls}
            value={value.storeLocation ?? 'MAIN_STORE'}
            onChange={(e) => onChange({ storeLocation: e.target.value as StoreLocation })}
          >
            {LOCATIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Shelf" htmlFor="shelf">
          <input
            id="shelf"
            className={`${inputCls} font-mono`}
            value={value.shelfLocation ?? ''}
            onChange={(e) => onChange({ shelfLocation: e.target.value })}
            placeholder="e.g. A3"
          />
        </Field>
        <Field label="Qty" htmlFor="qty">
          <input
            id="qty"
            type="number"
            min={0}
            className={`${inputCls} font-mono`}
            value={value.stock ?? 0}
            onChange={(e) => onChange({ stock: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Low-stock at" htmlFor="threshold">
          <input
            id="threshold"
            type="number"
            min={0}
            className={`${inputCls} font-mono`}
            value={value.lowStockThreshold ?? 2}
            onChange={(e) => onChange({ lowStockThreshold: Number(e.target.value) || 0 })}
          />
        </Field>
      </div>

      <div className="grid grid-cols-[180px_1fr] gap-3.5 mt-3.5 max-md:grid-cols-1 items-end">
        <Field label="Weight" htmlFor="weight">
          <div className="flex items-center bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[6px] focus-within:border-[var(--accent)]">
            <input
              id="weight"
              type="number"
              min={0}
              className="w-full bg-transparent px-3 py-[9px] text-[13px] font-mono text-[var(--text-primary)] outline-none"
              value={value.weightGrams ?? ''}
              onChange={(e) =>
                onChange({ weightGrams: e.target.value === '' ? null : Number(e.target.value) })
              }
              placeholder="e.g. 250"
              aria-label="Weight in grams"
            />
            <span className="pr-3 text-[12px] text-[var(--text-muted)]">g</span>
          </div>
        </Field>
        <Field label="Dimensions (L × W × H)">
          <div className="flex items-center gap-1.5">
            {(['l', 'w', 'h'] as const).map((axis, i) => (
              <div key={axis} className="contents">
                <input
                  className={`${inputCls} font-mono`}
                  value={dims[axis] ?? ''}
                  onChange={(e) =>
                    onChange({
                      dimensionsMm: { ...(value.dimensionsMm ?? {}), [axis]: e.target.value },
                    })
                  }
                  placeholder={axis.toUpperCase()}
                  aria-label={`${axis.toUpperCase()} in millimetres`}
                />
                {i < 2 && <span className="text-[var(--text-muted)] text-[12px]">×</span>}
              </div>
            ))}
            <span className="pl-1 text-[12px] text-[var(--text-muted)]">mm</span>
          </div>
        </Field>
      </div>

      <p className="text-[11px] text-[var(--text-muted)] mt-3">
        Weight &amp; dimensions guide shipping estimates; persistence coming in a follow-up. Stock
        refreshes from DealPOS on every sync; per-location allocation arrives with the
        multi-location phase.
      </p>
    </PanelHeader>
  );
}

import type { Release } from '@mf/shared';
import { PanelHeader } from './PanelHeader';
import { CONDITIONS, Field, FORMATS, inputCls } from './shared';
import type { SectionProps } from './types';

export function FormatCondition({ value, onChange }: SectionProps) {
  return (
    <PanelHeader number={2} title="Format & condition">
      <div className="grid grid-cols-3 gap-3.5 max-md:grid-cols-1">
        <Field label="Format" required htmlFor="format">
          <select
            id="format"
            className={inputCls}
            value={value.format ?? 'LP'}
            onChange={(e) => onChange({ format: e.target.value as Release['format'] })}
          >
            {FORMATS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Genre" htmlFor="genre">
          <input
            id="genre"
            className={inputCls}
            value={value.genre ?? ''}
            onChange={(e) => onChange({ genre: e.target.value })}
            placeholder="e.g. Vinyl Import"
          />
        </Field>
        <Field label="Barcode" htmlFor="barcode">
          <input
            id="barcode"
            className={`${inputCls} font-mono`}
            value={value.barcode ?? ''}
            onChange={(e) => onChange({ barcode: e.target.value })}
            placeholder="EAN-13 / Code128"
          />
        </Field>
      </div>
      <div className="grid grid-cols-[1fr_180px_180px] gap-3.5 mt-3.5 max-md:grid-cols-1 items-end">
        <Field label="Condition grade" required>
          <div className="flex gap-1.5 flex-wrap">
            {CONDITIONS.map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => onChange({ condition: v as Release['condition'] })}
                className={`text-[12px] font-mono px-3.5 py-1.5 rounded-full border transition-colors ${
                  value.condition === v
                    ? 'border-[var(--accent)] text-[var(--text-primary)]'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Media grade" htmlFor="media">
          <select
            id="media"
            className={inputCls}
            value={value.mediaGrade ?? ''}
            onChange={(e) => onChange({ mediaGrade: e.target.value || null })}
          >
            <option value="">—</option>
            {CONDITIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sleeve grade" htmlFor="sleeve">
          <select
            id="sleeve"
            className={inputCls}
            value={value.sleeveGrade ?? ''}
            onChange={(e) => onChange({ sleeveGrade: e.target.value || null })}
          >
            <option value="">—</option>
            {CONDITIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </PanelHeader>
  );
}

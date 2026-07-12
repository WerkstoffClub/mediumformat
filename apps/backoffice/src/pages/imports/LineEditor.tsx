import { fmtNative, FORMATS } from './shared';
import type { DraftLine } from './types';

interface LineEditorProps {
  value: DraftLine[];
  currency: string;
  onChange: (lines: DraftLine[]) => void;
}

const emptyLine = (): DraftLine => ({
  artist: '', title: '', label: '', catNumber: '', barcode: '',
  formatRaw: '', format: 'LP', edition: '',
  qty: 1, qtyBackorder: 0, unitPriceNative: 0, extendedNative: 0, weightKg: 0,
  lineValid: true,
});

const cellInputCls =
  'w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1 text-[12px] outline-none focus:border-[var(--text-muted)]';

/** Editable grid for the parsed invoice lines — table-like editor mirroring
 *  purchase-orders/LineEditor.tsx. Keeps extendedNative in sync with qty ×
 *  unitPriceNative unless the user has overridden it directly. */
export function LineEditor({ value, currency, onChange }: LineEditorProps) {
  const update = (idx: number, patch: Partial<DraftLine>) => {
    const next = value.map((l, i) => {
      if (i !== idx) return l;
      const merged = { ...l, ...patch };
      if ('qty' in patch || 'unitPriceNative' in patch) {
        merged.extendedNative = Number(merged.qty || 0) * Number(merged.unitPriceNative || 0);
      }
      return merged;
    });
    onChange(next);
  };
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const add = () => onChange([...value, emptyLine()]);

  return (
    <div>
      <div className="border border-[var(--border)] rounded-[8px] overflow-x-auto bg-[var(--bg-surface)]">
        <table className="w-full border-collapse text-[12px] min-w-[880px]">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              <th className="text-left px-3 py-2 text-[9px] uppercase tracking-[0.07em] text-[var(--text-faint)] font-semibold border-b border-[var(--border-sub)]">Artist / Title</th>
              <th className="text-left px-2 py-2 text-[9px] uppercase tracking-[0.07em] text-[var(--text-faint)] font-semibold border-b border-[var(--border-sub)] w-[130px]">Format</th>
              <th className="text-right px-2 py-2 text-[9px] uppercase tracking-[0.07em] text-[var(--text-faint)] font-semibold border-b border-[var(--border-sub)] w-[64px]">Qty</th>
              <th className="text-right px-2 py-2 text-[9px] uppercase tracking-[0.07em] text-[var(--text-faint)] font-semibold border-b border-[var(--border-sub)] w-[100px]">Unit price</th>
              <th className="text-right px-3 py-2 text-[9px] uppercase tracking-[0.07em] text-[var(--text-faint)] font-semibold border-b border-[var(--border-sub)] w-[110px]">Extended</th>
              <th className="border-b border-[var(--border-sub)] w-[32px]" />
            </tr>
          </thead>
          <tbody>
            {value.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-5 text-center text-[11px] text-[var(--text-faint)]">
                  No lines yet — parse an invoice, or add the first item.
                </td>
              </tr>
            )}
            {value.map((line, i) => (
              <LineRow
                key={i}
                line={line}
                currency={currency}
                onChange={patch => update(i, patch)}
                onRemove={() => remove(i)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-2 text-[12px] px-3 py-1.5 rounded-[6px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors"
      >
        + Add line
      </button>
    </div>
  );
}

function LineRow({
  line, currency, onChange, onRemove,
}: {
  line: DraftLine;
  currency: string;
  onChange: (patch: Partial<DraftLine>) => void;
  onRemove: () => void;
}) {
  return (
    <tr className={`border-t border-[var(--border-sub)] align-top ${!line.lineValid ? 'bg-[var(--warning-t)]' : ''}`}>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          {!line.lineValid && (
            <span title="Flagged by the parser — please review this line" className="text-[var(--warning)] flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
          )}
          <input
            type="text"
            value={line.artist}
            placeholder="Artist"
            onChange={e => onChange({ artist: e.target.value })}
            className={`${cellInputCls} mb-1`}
          />
        </div>
        <input
          type="text"
          value={line.title}
          placeholder="Title"
          onChange={e => onChange({ title: e.target.value })}
          className={cellInputCls}
        />
        {(line.catNumber || line.barcode) && (
          <span className="block font-mono text-[10px] text-[var(--text-faint)] mt-1 truncate">
            {[line.catNumber, line.barcode].filter(Boolean).join(' · ')}
          </span>
        )}
      </td>
      <td className="px-2 py-2">
        <select
          value={line.format}
          onChange={e => onChange({ format: e.target.value as DraftLine['format'] })}
          className={cellInputCls}
        >
          {FORMATS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        {line.formatRaw && <span className="block text-[10px] text-[var(--text-faint)] mt-1 truncate">"{line.formatRaw}"</span>}
      </td>
      <td className="px-2 py-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={line.qty}
          onChange={e => onChange({ qty: Number(e.target.value) })}
          className={`${cellInputCls} text-right font-mono`}
        />
        {line.qtyBackorder > 0 && (
          <span className="block text-[10px] text-[var(--warning)] mt-1 text-right whitespace-nowrap">{line.qtyBackorder} backorder</span>
        )}
      </td>
      <td className="px-2 py-2">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={line.unitPriceNative}
          onChange={e => onChange({ unitPriceNative: Number(e.target.value) })}
          className={`${cellInputCls} text-right font-mono`}
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={line.extendedNative}
          onChange={e => onChange({ extendedNative: Number(e.target.value) })}
          className={`${cellInputCls} text-right font-mono`}
        />
        <span className="block text-[10px] text-[var(--text-faint)] mt-1 text-right whitespace-nowrap">{fmtNative(line.extendedNative, currency)}</span>
      </td>
      <td className="px-2 py-2 text-center">
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove line"
          className="w-6 h-6 rounded-[5px] text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--bg-overlay)] transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 mx-auto" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

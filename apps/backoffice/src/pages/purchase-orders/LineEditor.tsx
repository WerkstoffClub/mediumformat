import { useEffect, useRef, useState } from 'react';
import type { Release } from '@mf/shared';
import { getReleases } from '../../api/inventory';
import { fmtIdr } from '../../api/ops';
import type { PoLine } from '../../api/purchaseOrders';

interface LineEditorProps {
  value: PoLine[];
  onChange: (lines: PoLine[]) => void;
}

const emptyLine = (): PoLine => ({
  description: '',
  qtyOrdered: 1,
  qtyReceived: 0,
  unitCostIdr: 0,
  totalIdr: 0,
  releaseId: null,
});

/** Table-like editor for PO lines. Emits a new array on any edit and
 *  keeps totalIdr in sync per row so the parent doesn't have to. */
export function LineEditor({ value, onChange }: LineEditorProps) {
  const update = (idx: number, patch: Partial<PoLine>) => {
    const next = value.map((l, i) => {
      if (i !== idx) return l;
      const merged = { ...l, ...patch };
      merged.totalIdr = Number(merged.qtyOrdered || 0) * Number(merged.unitCostIdr || 0);
      return merged;
    });
    onChange(next);
  };
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const add = () => onChange([...value, emptyLine()]);

  return (
    <div>
      <div className="border border-[var(--border)] rounded-[8px] overflow-visible bg-[var(--bg-surface)]">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              <th className="text-left px-3 py-2 text-[9px] uppercase tracking-[0.07em] text-[var(--text-faint)] font-semibold border-b border-[var(--border-sub)]">Item</th>
              <th className="text-right px-3 py-2 text-[9px] uppercase tracking-[0.07em] text-[var(--text-faint)] font-semibold border-b border-[var(--border-sub)] w-[64px]">Qty</th>
              <th className="text-right px-3 py-2 text-[9px] uppercase tracking-[0.07em] text-[var(--text-faint)] font-semibold border-b border-[var(--border-sub)] w-[110px]">Unit cost</th>
              <th className="text-right px-3 py-2 text-[9px] uppercase tracking-[0.07em] text-[var(--text-faint)] font-semibold border-b border-[var(--border-sub)] w-[110px]">Line total</th>
              <th className="border-b border-[var(--border-sub)] w-[32px]" />
            </tr>
          </thead>
          <tbody>
            {value.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-5 text-center text-[11px] text-[var(--text-faint)]">
                  No lines yet — add the first item.
                </td>
              </tr>
            )}
            {value.map((line, i) => (
              <LineRow
                key={i}
                line={line}
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
  line, onChange, onRemove,
}: {
  line: PoLine;
  onChange: (patch: Partial<PoLine>) => void;
  onRemove: () => void;
}) {
  return (
    <tr className="border-t border-[var(--border-sub)] align-top">
      <td className="px-3 py-2">
        <ReleaseAutocomplete
          description={line.description}
          releaseId={line.releaseId ?? null}
          onPick={patch => onChange(patch)}
          onFreeText={desc => onChange({ description: desc, releaseId: null })}
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={line.qtyOrdered}
          onChange={e => onChange({ qtyOrdered: Number(e.target.value) })}
          className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1 text-right font-mono text-[12px] outline-none focus:border-[var(--text-muted)]"
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={line.unitCostIdr}
          onChange={e => onChange({ unitCostIdr: Number(e.target.value) })}
          className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1 text-right font-mono text-[12px] outline-none focus:border-[var(--text-muted)]"
        />
      </td>
      <td className="px-3 py-2 text-right font-mono text-[12px] text-[var(--text-primary)] whitespace-nowrap">
        {fmtIdr(line.totalIdr)}
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

/** Free-text description input with a release autocomplete dropdown.
 *  User can type anything; picking a release fills the description and
 *  links the releaseId. Editing after picking clears the link. */
function ReleaseAutocomplete({
  description, releaseId, onPick, onFreeText,
}: {
  description: string;
  releaseId: string | null;
  onPick: (patch: Partial<PoLine>) => void;
  onFreeText: (desc: string) => void;
}) {
  const [query, setQuery] = useState(description);
  const [releases, setReleases] = useState<Release[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();
  const boxRef = useRef<HTMLDivElement>(null);

  // Keep local input in sync when the parent replaces the description.
  useEffect(() => { setQuery(description); }, [description]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    clearTimeout(debounce.current);
    const q = query.trim();
    if (!open || !q || q === description) { setReleases([]); return; }
    setLoading(true);
    debounce.current = setTimeout(() => {
      getReleases({ q, limit: 8 })
        .then(r => setReleases(r.data))
        .catch(() => setReleases([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(debounce.current);
  }, [query, open, description]);

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text"
        value={query}
        placeholder="Description or release…"
        onChange={e => {
          setQuery(e.target.value);
          onFreeText(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1 text-[12px] outline-none focus:border-[var(--text-muted)]"
      />
      {releaseId && (
        <span className="block text-[10px] text-[var(--text-faint)] mt-0.5 font-mono truncate">
          Linked to release · {releaseId.slice(0, 8)}
        </span>
      )}
      {open && (releases.length > 0 || loading) && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[6px] shadow-[0_6px_20px_rgba(0,0,0,.5)] overflow-hidden max-h-[240px] overflow-y-auto">
          {loading && <p className="px-3 py-2 text-[11px] text-[var(--text-faint)]">Searching…</p>}
          {!loading && releases.map(r => (
            <button
              key={r.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                const desc = `${r.artist} — ${r.title}`;
                setQuery(desc);
                onPick({ description: desc, releaseId: r.id });
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-[12px] hover:bg-[var(--bg-hover)] flex items-center justify-between gap-2"
            >
              <span className="min-w-0 truncate">
                <span className="text-[var(--text-primary)]">{r.artist}</span>
                <span className="text-[var(--text-muted)]"> — {r.title}</span>
              </span>
              <span className="font-mono text-[10px] text-[var(--text-faint)] whitespace-nowrap">{r.catNumber || '—'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

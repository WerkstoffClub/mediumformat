import { useState } from 'react';
import type { Release } from '@mf/shared';
import type { DiscogsMapped } from '../../../api/integrations';
import { ModalShell } from './ModalShell';
import type { ReleaseFormState, Track } from './types';

interface Props {
  payload: DiscogsMapped;
  onApply: (patch: Partial<ReleaseFormState>) => void;
  onCancel: () => void;
}

/**
 * Map a Discogs format string to our Prisma `RecordFormat` enum, best-effort.
 * We cast through `Release['format']` to match how the rest of the form treats
 * the (shared-type-mismatched) Prisma enum values as strings.
 */
function mapFormat(raw?: string): Release['format'] | undefined {
  if (!raw) return undefined;
  const s = raw.toLowerCase();
  const val =
    s.includes('7"') || s.includes('7 inch') ? 'SEVEN_INCH'
      : s.includes('12"') || s.includes('12 inch') ? 'TWELVE_INCH'
      : s.includes('2xlp') || s.includes('2×lp') || s.includes('2 lp') ? 'TWO_LP'
      : s.includes('3xlp') || s.includes('3×lp') || s.includes('3 lp') ? 'THREE_LP'
      : s.includes('2xcd') || s.includes('2×cd') || s.includes('2 cd') ? 'TWO_CD'
      : s.includes('cassette') || s.includes('tape') ? 'CASSETTE'
      : s.includes('cd') ? 'CD'
      : s.includes('vinyl') || s.includes('lp') ? 'LP'
      : null;
  return val ? (val as unknown as Release['format']) : undefined;
}

type FieldKey =
  | 'catNumber'
  | 'year'
  | 'country'
  | 'label'
  | 'format'
  | 'weight'
  | 'dimensions'
  | 'tracks';

interface RowSpec {
  key: FieldKey;
  label: string;
  value: string;
  disabled: boolean;
  hint?: string;
  apply: (patch: Partial<ReleaseFormState>) => void;
}

export function ApplyFromDiscogsModal({ payload, onApply, onCancel }: Props) {
  const mappedFormat = mapFormat(payload.format);

  const initialChecks: Record<FieldKey, boolean> = {
    catNumber: !!payload.catNumber,
    year: !!payload.year,
    country: !!payload.country,
    label: !!payload.label,
    format: !!mappedFormat,
    weight: false, // weight is never persisted (no schema column yet)
    dimensions: false, // Discogs doesn't provide these
    tracks: (payload.tracks?.length ?? 0) > 0,
  };

  const [checked, setChecked] = useState<Record<FieldKey, boolean>>(initialChecks);

  const rows: RowSpec[] = [
    {
      key: 'catNumber',
      label: 'Cat. number',
      value: payload.catNumber ?? '—',
      disabled: !payload.catNumber,
      apply: (p) => { p.catNumber = payload.catNumber; },
    },
    {
      key: 'year',
      label: 'Year',
      value: payload.year ? String(payload.year) : '—',
      disabled: !payload.year,
      apply: (p) => { p.year = payload.year; },
    },
    {
      key: 'country',
      label: 'Country',
      value: payload.country ?? '—',
      disabled: !payload.country,
      apply: (p) => { p.country = payload.country; },
    },
    {
      key: 'label',
      label: 'Label',
      value: payload.label ?? '—',
      disabled: !payload.label,
      apply: (p) => { p.label = payload.label; },
    },
    {
      key: 'format',
      label: 'Format',
      value: payload.format ? `${payload.format}${mappedFormat ? ` → ${mappedFormat}` : ''}` : '—',
      disabled: !mappedFormat,
      hint: !mappedFormat && payload.format ? 'Could not map to a known format — set manually' : undefined,
      apply: (p) => { if (mappedFormat) p.format = mappedFormat; },
    },
    {
      key: 'weight',
      label: 'Weight',
      value: payload.weightGrams != null ? `${payload.weightGrams} g` : '—',
      disabled: true,
      hint: payload.weightGrams == null
        ? 'Discogs did not return this — enter manually'
        : 'Persistence coming in a follow-up',
      apply: () => {},
    },
    {
      key: 'dimensions',
      label: 'Dimensions',
      value: '—',
      disabled: true,
      hint: 'Discogs does not provide dimensions',
      apply: () => {},
    },
    {
      key: 'tracks',
      label: 'Tracklist',
      value: `${payload.tracks?.length ?? 0} track${payload.tracks?.length === 1 ? '' : 's'}`,
      disabled: (payload.tracks?.length ?? 0) === 0,
      hint: (payload.tracks?.length ?? 0) > 0
        ? 'Replaces the current tracklist entirely'
        : undefined,
      apply: (p) => {
        p.tracks = (payload.tracks ?? []).map((t): Track => ({
          position: t.position,
          title: t.title,
          duration: t.duration,
          previews: {},
        }));
      },
    },
  ];

  const applySelection = () => {
    const patch: Partial<ReleaseFormState> = { discogsId: payload.discogsId };
    for (const row of rows) {
      if (checked[row.key] && !row.disabled) row.apply(patch);
    }
    onApply(patch);
  };

  return (
    <ModalShell
      title="Apply from Discogs"
      subtitle={`${payload.artist} — ${payload.title}`}
      onClose={onCancel}
      widthClass="max-w-[640px]"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-[9px] rounded-[6px] text-[12.5px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={applySelection}
            className="px-3.5 py-[9px] rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] text-[12.5px] font-semibold hover:opacity-[.88]"
          >
            Apply selected
          </button>
        </>
      }
    >
      <div className="mb-3 p-2.5 rounded-[6px] border border-[var(--warning)] bg-[var(--warning-t)]">
        <p className="text-[12.5px] font-semibold text-[var(--warning)]">
          Nothing is applied until you confirm.
        </p>
        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
          Uncheck any row you want to leave untouched.
        </p>
      </div>

      <table className="w-full text-[12.5px] border-collapse">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-muted)]">
            <th className="text-left py-1.5 pl-1 pr-2 w-8"></th>
            <th className="text-left py-1.5 pr-2 w-[130px]">Field</th>
            <th className="text-left py-1.5 pr-2">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-[var(--border-sub)]">
              <td className="py-2 pl-1 pr-2">
                <input
                  type="checkbox"
                  disabled={row.disabled}
                  checked={!row.disabled && checked[row.key]}
                  onChange={(e) =>
                    setChecked((prev) => ({ ...prev, [row.key]: e.target.checked }))
                  }
                  aria-label={`Apply ${row.label}`}
                  className="accent-[var(--accent)] disabled:opacity-40"
                />
              </td>
              <td className="py-2 pr-2 text-[var(--text-secondary)]">{row.label}</td>
              <td className="py-2 pr-2">
                <span className={row.disabled ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}>
                  {row.value}
                </span>
                {row.hint && (
                  <p className="text-[10.5px] text-[var(--text-faint)] mt-0.5">{row.hint}</p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ModalShell>
  );
}

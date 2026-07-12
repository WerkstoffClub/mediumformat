import { GetDetailsButton } from './GetDetailsButton';
import { PanelHeader } from './PanelHeader';
import { Field, inputCls } from './shared';
import type { SectionProps } from './types';

export function Basics({ value, onChange }: SectionProps) {
  const actions = (
    <GetDetailsButton
      discogsId={value.discogsId}
      artist={value.artist}
      title={value.title}
      onApply={onChange}
    />
  );
  return (
    <PanelHeader number={1} title="Basics" actions={actions}>
      <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
        <Field label="Artist" required htmlFor="artist">
          <input
            id="artist"
            className={inputCls}
            value={value.artist ?? ''}
            onChange={(e) => onChange({ artist: e.target.value })}
            required
          />
        </Field>
        <Field label="Title" required htmlFor="title">
          <input
            id="title"
            className={inputCls}
            value={value.title ?? ''}
            onChange={(e) => onChange({ title: e.target.value })}
            required
          />
        </Field>
        <Field label="Label" htmlFor="label">
          <input
            id="label"
            className={inputCls}
            value={value.label ?? ''}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-3 gap-3.5">
          <Field label="Cat. number" htmlFor="cat">
            <input
              id="cat"
              className={`${inputCls} font-mono`}
              value={value.catNumber ?? ''}
              onChange={(e) => onChange({ catNumber: e.target.value })}
            />
          </Field>
          <Field label="Year" htmlFor="year">
            <input
              id="year"
              type="number"
              min={1900}
              max={2099}
              className={`${inputCls} font-mono`}
              value={value.year ?? ''}
              onChange={(e) => onChange({ year: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Country" htmlFor="country">
            <input
              id="country"
              className={inputCls}
              value={value.country ?? ''}
              onChange={(e) => onChange({ country: e.target.value })}
              placeholder="e.g. UK"
            />
          </Field>
        </div>
      </div>
    </PanelHeader>
  );
}

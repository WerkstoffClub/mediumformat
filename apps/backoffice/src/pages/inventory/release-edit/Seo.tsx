import type { AssistKind } from '../../../api/inventory';
import { PanelHeader } from './PanelHeader';
import { AiButton, Field, inputCls } from './shared';
import type { SectionProps } from './types';

interface Props extends SectionProps {
  aiBusy: AssistKind | null;
  runAi: (kind: AssistKind, target: 'notes' | 'seoTitle' | 'seoDescription') => void;
}

export function Seo({ value, onChange, aiBusy, runAi }: Props) {
  return (
    <PanelHeader number={8} title="SEO" note="Search & social preview">
      <div className="space-y-3.5">
        <Field label="URL slug" htmlFor="slug">
          <div className="flex items-center bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[6px] focus-within:border-[var(--accent)]">
            <span className="pl-3 text-[12px] text-[var(--text-muted)] font-mono whitespace-nowrap">
              /release/
            </span>
            <input
              id="slug"
              className="w-full bg-transparent px-2 py-[9px] text-[13px] text-[var(--text-primary)] outline-none"
              value={value.slug ?? ''}
              onChange={(e) => onChange({ slug: e.target.value })}
              placeholder="artist-title"
            />
          </div>
        </Field>
        <Field
          label="Meta title"
          htmlFor="metatitle"
          aiButton={
            <AiButton
              small
              busy={aiBusy === 'metatitle'}
              onClick={() => runAi('metatitle', 'seoTitle')}
            />
          }
        >
          <input
            id="metatitle"
            className={inputCls}
            value={value.seoTitle ?? ''}
            onChange={(e) => onChange({ seoTitle: e.target.value })}
            maxLength={70}
            placeholder="Artist — Title (LP) | Medium Format"
          />
        </Field>
        <Field
          label="Meta description"
          htmlFor="metadesc"
          aiButton={
            <AiButton
              small
              busy={aiBusy === 'metadesc'}
              onClick={() => runAi('metadesc', 'seoDescription')}
            />
          }
        >
          <textarea
            id="metadesc"
            className={`${inputCls} min-h-[72px] resize-y`}
            value={value.seoDescription ?? ''}
            onChange={(e) => onChange({ seoDescription: e.target.value })}
            maxLength={170}
          />
        </Field>
      </div>
    </PanelHeader>
  );
}

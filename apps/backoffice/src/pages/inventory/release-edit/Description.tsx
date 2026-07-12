import type { AssistKind } from '../../../api/inventory';
import { PanelHeader } from './PanelHeader';
import { AiButton, Field, inputCls } from './shared';
import type { SectionProps } from './types';

interface Props extends SectionProps {
  aiBusy: AssistKind | null;
  runAi: (kind: AssistKind, target: 'notes' | 'seoTitle' | 'seoDescription') => void;
}

export function Description({ value, onChange, aiBusy, runAi }: Props) {
  return (
    <PanelHeader
      number={7}
      title="Description"
      actions={<AiButton busy={aiBusy === 'desc'} onClick={() => runAi('desc', 'notes')} />}
    >
      <Field label="Storefront description" htmlFor="desc">
        <textarea
          id="desc"
          className={`${inputCls} min-h-[96px] resize-y`}
          value={value.notes ?? ''}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Tell the story of this record…"
        />
      </Field>
    </PanelHeader>
  );
}

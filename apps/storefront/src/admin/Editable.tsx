import { useEffect, useRef, type ElementType } from 'react';
import { useAdminEdit } from './AdminEditContext';
import type { EditEntity } from './AdminEditContext';

interface EditableProps {
  entity: EditEntity;
  id: string;
  field: string;
  value: string | null;
  /** Displayed (read-mode only) when value is empty — e.g. title behind a headline. */
  fallback?: string | null;
  as?: ElementType;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
}

export function Editable({
  entity, id, field, value, fallback, as, className, placeholder, multiline,
}: EditableProps) {
  const { isAdmin, editMode, getValue, stage, rev } = useAdminEdit();
  const ref = useRef<HTMLElement>(null);
  const As: ElementType = as ?? 'span';
  const editing = isAdmin && editMode;

  const current = getValue(entity, id, field, value ?? '');
  const display = current || (editing ? '' : (fallback ?? '') || '');

  // In edit mode, set the DOM text imperatively and DON'T pass children —
  // this stops React from resetting the caret on each keystroke/re-render.
  // Deps are the field *identity* (entity/id/field) + editing/rev — NOT `current`:
  // identity changes on client-side navigation between pages (so the field
  // re-syncs to the new page's value) but stays stable while typing (so the
  // caret never jumps). Depending on `current` would reintroduce caret resets.
  useEffect(() => {
    if (editing && ref.current && ref.current.textContent !== current) {
      ref.current.textContent = current;
    }
  }, [editing, rev, entity, id, field]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!editing) {
    if (!display) return null;   // hide empty fields for visitors (matches current behaviour)
    return <As className={className}>{display}</As>;
  }

  return (
    <As
      ref={ref as React.Ref<HTMLElement>}
      className={className}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline={multiline ? true : undefined}
      aria-label={placeholder ?? field}
      data-editable={field}
      data-empty={current ? undefined : ''}
      style={{
        outline: '1px dashed var(--accent)',
        outlineOffset: '3px',
        borderRadius: '3px',
        cursor: 'text',
        minWidth: '1ch',
      }}
      onInput={(e: React.FormEvent<HTMLElement>) => {
        const raw = e.currentTarget.textContent ?? '';
        // Single-line fields collapse every newline to a space; multiline
        // fields keep single breaks but collapse runs of blank lines.
        stage(entity, id, field, multiline ? raw.replace(/\n{2,}/g, '\n') : raw.replace(/\n+/g, ' '));
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => { if (!multiline && e.key === 'Enter') e.preventDefault(); }}
    />
  );
}

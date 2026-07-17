import { useAdminEdit } from './AdminEditContext';

export function SaveBar() {
  const { isAdmin, editMode, dirtyCount, saving, saveError, save, discardAll } = useAdminEdit();
  if (!isAdmin || !editMode || dirtyCount === 0) return null;

  return (
    <div
      className="fixed left-1/2 z-[215] flex items-center gap-3 -translate-x-1/2 rounded-[var(--r-pill)] px-4 py-2 text-[13px] backdrop-blur"
      style={{
        bottom: 'calc(var(--player-h) + 72px)',
        background: 'var(--surface)',
        border: '1px solid var(--hairline)',
        boxShadow: 'var(--e3)',
        color: 'var(--ink)',
      }}
      role="region"
      aria-label="Unsaved changes"
    >
      <span style={{ color: 'var(--body)' }}>
        {dirtyCount} unsaved change{dirtyCount === 1 ? '' : 's'}
      </span>
      {saveError && <span style={{ color: 'var(--danger)' }}>{saveError}</span>}
      <button
        type="button"
        onClick={discardAll}
        disabled={saving}
        className="text-[12px]"
        style={{ color: 'var(--mute)' }}
      >
        Discard
      </button>
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="rounded-[var(--r-pill)] px-3 py-1 text-[12px] font-medium disabled:opacity-50"
        style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}

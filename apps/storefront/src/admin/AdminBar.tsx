import { useAdminEdit } from './AdminEditContext';

/**
 * Floating admin-only control — bottom-centre, sitting above the sticky
 * Now-Playing bar (--player-h). Renders nothing for anonymous visitors.
 * Monochrome per DESIGN.md v2.1: surface/hairline/ink tokens, accent only
 * for the active "Edit mode" state (accent inverts per theme).
 */
export function AdminBar() {
  const { isAdmin, user, editMode, toggleEdit, signOut } = useAdminEdit();
  if (!isAdmin) return null;

  return (
    <div
      className="fixed left-1/2 z-[205] flex -translate-x-1/2 items-center gap-3
                 border border-[var(--hairline)] bg-[var(--surface)] px-4 py-2
                 text-[13px] text-[var(--ink)] shadow-[var(--e2)]
                 bottom-[calc(var(--player-h)_+_16px)] rounded-[var(--r-pill)]"
      role="region"
      aria-label="Admin controls"
    >
      <span className="font-medium">{user?.name}</span>
      <span className="text-[var(--mute)]">·</span>
      <button
        type="button"
        onClick={toggleEdit}
        aria-pressed={editMode}
        className={`rounded-[var(--r-pill)] px-3 py-1 text-[12px] font-medium transition-colors ${
          editMode
            ? 'bg-[var(--accent)] text-[var(--accent-text)]'
            : 'border border-[var(--hairline)] text-[var(--body)] hover:border-[var(--mute)] hover:text-[var(--ink)]'
        }`}
      >
        {editMode ? 'Editing — on' : 'Edit mode'}
      </button>
      <button
        type="button"
        onClick={signOut}
        className="text-[12px] text-[var(--mute)] transition-colors hover:text-[var(--ink)]"
      >
        Sign out
      </button>
    </div>
  );
}

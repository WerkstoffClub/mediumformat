import { useCallback, useEffect, useRef, useState } from 'react';
import type { Release } from '@mf/shared';
import { getReleases } from '../../api/inventory';
import { setPreorder, type PreorderRelease } from '../../api/preorders';

const ANIM_MS = 220;

interface Props {
  /** null = new preorder (need release picker). Otherwise editing an existing one. */
  release: PreorderRelease | null;
  onClose: () => void;
  onSaved: () => void;
  onToast: (kind: 'ok' | 'err', text: string) => void;
}

/** mf-panel-hdr recipe — solid accent bar with accent-text. */
function PanelHdr({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-text)] text-[11px] font-semibold uppercase tracking-[0.08em]">
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-4 mb-4 border border-[var(--border)] rounded-[8px] overflow-hidden">
      <PanelHdr>{title}</PanelHdr>
      <div className="p-4 space-y-3 bg-[var(--bg-surface)]">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.05em] text-[var(--text-muted)] mb-1">{label}</span>
      {children}
    </label>
  );
}

const dateInputValue = (v: string | null | undefined) => (v ? v.slice(0, 10) : '');

export function AddPreorderDrawer({ release, onClose, onSaved, onToast }: Props) {
  const isEdit = Boolean(release);

  // Chosen release for a NEW preorder (autocomplete). When editing, we
  // always operate on the passed-in release id.
  const [chosen, setChosen] = useState<Release | null>(null);
  const [eta, setEta] = useState<string>(dateInputValue(release?.preorderEta));
  const [notes, setNotes] = useState<string>(release?.notes ?? '');

  // Autocomplete state.
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState<Release[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const close = useCallback(() => {
    setOpen(false);
    setTimeout(() => onCloseRef.current(), ANIM_MS);
  }, []);

  useEffect(() => {
    const t = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // Debounced release lookup. Only used when adding a new preorder.
  useEffect(() => {
    if (isEdit || !q.trim()) { setSuggestions([]); return; }
    let active = true;
    const t = setTimeout(() => {
      getReleases({ q, limit: 8 })
        .then(res => { if (active) setSuggestions(res.data); })
        .catch(() => { if (active) setSuggestions([]); });
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [q, isEdit]);

  const validate = (): string | null => {
    const targetId = isEdit ? release?.id : chosen?.id;
    if (!targetId) return 'Pick a release first.';
    if (!eta) return 'ETA is required.';
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) { onToast('err', err); return; }
    const targetId = isEdit ? release!.id : chosen!.id;
    setSaving(true);
    try {
      await setPreorder(targetId, {
        eta,
        notes: notes.trim() || undefined,
      });
      onToast('ok', isEdit ? 'Preorder ETA updated.' : 'Preorder added.');
      onSaved();
      close();
    } catch {
      onToast('err', 'Could not save preorder.');
    } finally {
      setSaving(false);
    }
  };

  const displayRelease = isEdit
    ? { artist: release?.artist ?? '', title: release?.title ?? '', format: release?.format ?? '' }
    : chosen
      ? { artist: chosen.artist, title: chosen.title, format: chosen.format }
      : null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={close}
      />
      <aside
        role="dialog"
        aria-label={isEdit ? 'Edit preorder ETA' : 'Add preorder'}
        className={`absolute right-0 top-0 h-full w-full max-w-[520px] bg-[var(--bg-base)] border-l border-[var(--border)] shadow-[0_8px_24px_rgba(0,0,0,.6)] flex flex-col transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-start gap-3 px-5 py-3.5 border-b border-[var(--border)] flex-shrink-0 bg-[var(--bg-surface)]">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {isEdit ? 'Edit preorder' : 'New preorder'}
            </p>
            <h2 className="mt-1 text-[16px] font-semibold text-[var(--text-primary)]">
              {isEdit ? 'Edit preorder ETA' : 'Add preorder'}
            </h2>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pt-4">
          {!isEdit && (
            <Section title="Release">
              <Field label="Search inventory">
                <div className="relative">
                  <input
                    type="text"
                    value={chosen ? `${chosen.artist} — ${chosen.title}` : q}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={e => {
                      setChosen(null);
                      setQ(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="Type artist or title…"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
                  />
                  {showSuggestions && suggestions.length > 0 && !chosen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[6px] shadow-lg overflow-hidden z-10 max-h-[240px] overflow-y-auto">
                      {suggestions.map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            setChosen(r);
                            setQ('');
                            setShowSuggestions(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-[var(--bg-hover)] border-b border-[var(--border-sub)] last:border-b-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[var(--text-primary)] truncate">{r.artist}</p>
                            <p className="text-[var(--text-muted)] text-[11px] truncate">{r.title}</p>
                          </div>
                          <span className="text-[10px] text-[var(--text-faint)] uppercase whitespace-nowrap">{r.format}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>

              {displayRelease && (
                <div className="p-3 rounded-[6px] border border-[var(--border-sub)] bg-[var(--bg-overlay)]">
                  <p className="text-[12px] text-[var(--text-primary)] font-medium">{displayRelease.artist}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{displayRelease.title}</p>
                  <p className="text-[10px] text-[var(--text-faint)] uppercase mt-1">{displayRelease.format}</p>
                </div>
              )}
            </Section>
          )}

          {isEdit && displayRelease && (
            <Section title="Release">
              <div className="p-3 rounded-[6px] border border-[var(--border-sub)] bg-[var(--bg-overlay)]">
                <p className="text-[12px] text-[var(--text-primary)] font-medium">{displayRelease.artist}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{displayRelease.title}</p>
                <p className="text-[10px] text-[var(--text-faint)] uppercase mt-1">{displayRelease.format}</p>
              </div>
            </Section>
          )}

          <Section title="Preorder details">
            <Field label="ETA">
              <input
                type="date"
                value={eta}
                onChange={e => setEta(e.target.value)}
                className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
              />
            </Field>
            <Field label="Notes (internal)">
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. shipping via label X in early July"
                className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)] resize-none"
              />
            </Field>
          </Section>
        </div>

        <div className="border-t border-[var(--border)] px-4 py-3 flex items-center gap-2 flex-shrink-0 bg-[var(--bg-surface)]">
          <div className="flex-1" />
          <button
            type="button"
            onClick={close}
            disabled={saving}
            className="text-[12px] px-3 py-2 rounded-[6px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="text-[12px] px-3 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </aside>
    </div>
  );
}

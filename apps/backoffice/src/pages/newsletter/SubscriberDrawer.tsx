import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createSubscriber, deleteSubscriber, updateSubscriber,
  type NewsletterSource, type Subscriber,
} from '../../api/newsletter';

const ANIM_MS = 220;

const SOURCE_LABEL: Record<NewsletterSource, string> = {
  STOREFRONT: 'Storefront',
  CHECKOUT:   'Checkout',
  POS:        'POS',
  MANUAL:     'Manual',
  IMPORT:     'Import',
};

const SOURCES: NewsletterSource[] = ['STOREFRONT', 'CHECKOUT', 'POS', 'MANUAL', 'IMPORT'];

interface Props {
  /** null = new subscriber (unsaved). Otherwise the row from the list. */
  subscriber: Subscriber | null;
  onClose: () => void;
  onSaved: () => void;
  onToast: (kind: 'ok' | 'err', text: string) => void;
}

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

export function SubscriberDrawer({ subscriber, onClose, onSaved, onToast }: Props) {
  const isNew = subscriber === null;

  const [email, setEmail] = useState(subscriber?.email ?? '');
  const [name, setName] = useState(subscriber?.name ?? '');
  const [source, setSource] = useState<NewsletterSource>(subscriber?.source ?? 'MANUAL');
  const [tags, setTags] = useState<string[]>(subscriber?.tags ?? []);
  const [tagInput, setTagInput] = useState('');

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

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/,$/, '');
    if (!t) return;
    setTags(prev => (prev.includes(t) ? prev : [...prev, t]));
    setTagInput('');
  };

  const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t));

  const validate = (): string | null => {
    const e = email.trim();
    if (!e) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'Enter a valid email address.';
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) { onToast('err', err); return; }
    setSaving(true);
    try {
      const body = {
        email: email.trim().toLowerCase(),
        name: name.trim() || null,
        source,
        tags,
      };
      if (isNew) {
        await createSubscriber(body);
        onToast('ok', 'Subscriber added.');
      } else if (subscriber) {
        await updateSubscriber(subscriber.id, body);
        onToast('ok', 'Subscriber updated.');
      }
      onSaved();
      close();
    } catch {
      onToast('err', 'Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!subscriber) return;
    if (!confirm(`Delete ${subscriber.email}? This can't be undone.`)) return;
    try {
      await deleteSubscriber(subscriber.id);
      onToast('ok', 'Subscriber deleted.');
      onSaved();
      close();
    } catch {
      onToast('err', 'Delete failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={close}
      />
      <aside
        role="dialog"
        aria-label={subscriber ? `Subscriber ${subscriber.email}` : 'New subscriber'}
        className={`absolute right-0 top-0 h-full w-full max-w-[480px] bg-[var(--bg-base)] border-l border-[var(--border)] shadow-[0_8px_24px_rgba(0,0,0,.6)] flex flex-col transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-start gap-3 px-5 py-3.5 border-b border-[var(--border)] flex-shrink-0 bg-[var(--bg-surface)]">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {isNew ? 'New subscriber' : 'Subscriber'}
            </p>
            <h2 className="mt-1 text-[16px] font-semibold text-[var(--text-primary)] truncate">
              {isNew ? 'Add subscriber' : subscriber?.email}
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
          <Section title="Contact">
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
              />
            </Field>
            <Field label="Name (optional)">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
              />
            </Field>
            <Field label="Source">
              <select
                value={source}
                onChange={e => setSource(e.target.value as NewsletterSource)}
                className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
              >
                {SOURCES.map(s => (
                  <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
                ))}
              </select>
            </Field>
          </Section>

          <Section title="Tags">
            <Field label="Add tag (Enter to commit)">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag(tagInput);
                  } else if (e.key === 'Backspace' && !tagInput && tags.length) {
                    setTags(prev => prev.slice(0, -1));
                  }
                }}
                placeholder="e.g. jazz, vip"
                className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)] placeholder:text-[var(--text-faint)]"
              />
            </Field>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map(t => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-overlay)] text-[var(--text-primary)]"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      aria-label={`Remove tag ${t}`}
                      className="text-[var(--text-muted)] hover:text-[var(--danger)]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Section>

          {subscriber?.unsubscribedAt && (
            <div className="mx-4 mb-4 p-3 rounded-[6px] border border-[var(--warning)] bg-[var(--warning-t)] text-[var(--warning)] text-[11.5px]">
              This subscriber unsubscribed on {new Date(subscriber.unsubscribedAt).toLocaleDateString()}. They will not receive campaigns.
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border)] px-4 py-3 flex items-center gap-2 flex-shrink-0 bg-[var(--bg-surface)]">
          {subscriber && (
            <button
              type="button"
              onClick={doDelete}
              disabled={saving}
              className="text-[12px] px-3 py-2 rounded-[6px] border border-[var(--border)] text-[var(--danger)] hover:border-[var(--danger)] disabled:opacity-50 transition-colors"
            >
              Delete
            </button>
          )}
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

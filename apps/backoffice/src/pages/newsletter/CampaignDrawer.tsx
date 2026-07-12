import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createCampaign, deleteCampaign, getCampaign, updateCampaign,
  type Campaign, type CampaignStatus,
} from '../../api/newsletter';

const ANIM_MS = 220;
const PROVIDER_UNCONNECTED = 'Email provider not connected (Resend / Mailchimp)';

const STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: 'Draft', SCHEDULED: 'Scheduled', SENT: 'Sent',
};

interface Props {
  /** null = new campaign (unsaved DRAFT) */
  campaignId: string | null;
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

const dtLocalValue = (v: string | null | undefined) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const isoFromLocal = (v: string): string | null => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

export function CampaignDrawer({ campaignId, onClose, onSaved, onToast }: Props) {
  const isNew = campaignId === null;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [body, setBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    if (isNew) return;
    let active = true;
    setError(null);
    getCampaign(campaignId as string)
      .then(c => {
        if (!active) return;
        setCampaign(c);
        setSubject(c.subject);
        setPreviewText(c.previewText ?? '');
        setBody(c.body);
        setScheduledAt(dtLocalValue(c.scheduledAt));
      })
      .catch(() => { if (active) setError('Could not load this campaign.'); });
    return () => { active = false; };
  }, [campaignId, isNew]);

  const status: CampaignStatus = campaign?.status ?? 'DRAFT';
  const readonly = status === 'SENT';

  const validate = (): string | null => {
    if (!subject.trim()) return 'Subject is required.';
    if (!body.trim()) return 'Body is required.';
    return null;
  };

  const doSave = async (nextStatus?: CampaignStatus) => {
    const err = validate();
    if (err) { onToast('err', err); return; }
    if (nextStatus === 'SCHEDULED' && !scheduledAt) {
      onToast('err', 'Pick a scheduled-for time.');
      return;
    }
    setSaving(true);
    try {
      const bodyPayload = {
        subject: subject.trim(),
        previewText: previewText.trim() || null,
        body,
        scheduledAt: isoFromLocal(scheduledAt),
      };
      if (isNew) {
        const created = await createCampaign(bodyPayload);
        if (nextStatus === 'SCHEDULED') {
          await updateCampaign(created.id, { status: 'SCHEDULED' });
        }
        onToast('ok', nextStatus === 'SCHEDULED' ? 'Campaign scheduled.' : 'Draft saved.');
      } else if (campaign) {
        const patch: Partial<Campaign> = { ...bodyPayload };
        if (nextStatus) patch.status = nextStatus;
        await updateCampaign(campaign.id, patch);
        onToast(
          'ok',
          nextStatus === 'SCHEDULED' ? 'Campaign scheduled.'
            : nextStatus === 'DRAFT' ? 'Campaign unscheduled.'
              : 'Changes saved.',
        );
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
    if (!campaign) return;
    if (!confirm(`Delete "${campaign.subject}"? This can't be undone.`)) return;
    try {
      await deleteCampaign(campaign.id);
      onToast('ok', 'Campaign deleted.');
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
        aria-label={campaign ? `Campaign ${campaign.subject}` : 'New campaign'}
        className={`absolute right-0 top-0 h-full w-full max-w-[640px] bg-[var(--bg-base)] border-l border-[var(--border)] shadow-[0_8px_24px_rgba(0,0,0,.6)] flex flex-col transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-start gap-3 px-5 py-3.5 border-b border-[var(--border)] flex-shrink-0 bg-[var(--bg-surface)]">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {isNew ? 'New campaign' : 'Campaign'}
            </p>
            <div className="flex items-center gap-2 mt-1 min-w-0">
              <h2 className="text-[16px] font-semibold text-[var(--text-primary)] truncate">
                {subject || 'Untitled campaign'}
              </h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)] whitespace-nowrap">
                {STATUS_LABEL[status]}
              </span>
            </div>
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
          {error && <p className="mx-4 mb-4 text-[12px] text-[var(--danger)]">{error}</p>}
          {!error && !isNew && !campaign && <p className="mx-4 mb-4 text-[12px] text-[var(--text-faint)]">Loading…</p>}
          {(isNew || campaign) && !error && (
            <>
              {readonly && (
                <div className="mx-4 mb-4 p-3 rounded-[6px] border border-[var(--border)] bg-[var(--bg-overlay)]">
                  <p className="text-[12px] font-semibold text-[var(--text-primary)] mb-0.5">Sent</p>
                  <p className="text-[11.5px] text-[var(--text-secondary)]">
                    Sent{campaign?.sentAt ? ` on ${new Date(campaign.sentAt).toLocaleString()}` : ''} to {campaign?.recipientCount ?? 0} recipient{campaign?.recipientCount === 1 ? '' : 's'}. This campaign is read-only.
                  </p>
                </div>
              )}

              <Section title="Content">
                <Field label="Subject">
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    disabled={readonly}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)] disabled:opacity-70"
                  />
                </Field>
                <Field label="Preview text (optional)">
                  <input
                    type="text"
                    value={previewText}
                    onChange={e => setPreviewText(e.target.value)}
                    disabled={readonly}
                    placeholder="Shown after the subject in the inbox…"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)] placeholder:text-[var(--text-faint)] disabled:opacity-70"
                  />
                </Field>
                <Field label="Body (Markdown)">
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    disabled={readonly}
                    className="w-full font-mono text-[12px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)] resize-y disabled:opacity-70"
                    style={{ minHeight: 240 }}
                  />
                </Field>
              </Section>

              <Section title="Schedule">
                <Field label="Scheduled for (required to schedule)">
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                    disabled={readonly}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)] disabled:opacity-70"
                  />
                </Field>
              </Section>
            </>
          )}
        </div>

        {(isNew || campaign) && !error && (
          <div className="border-t border-[var(--border)] px-4 py-3 flex items-center gap-2 flex-shrink-0 bg-[var(--bg-surface)] flex-wrap">
            {campaign && !readonly && (
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
              disabled
              title={PROVIDER_UNCONNECTED}
              className="text-[12px] px-3 py-2 rounded-[6px] border border-[var(--border)] text-[var(--text-muted)] opacity-50 cursor-not-allowed"
            >
              Send now
            </button>

            {!readonly && (
              <button
                type="button"
                onClick={close}
                disabled={saving}
                className="text-[12px] px-3 py-2 rounded-[6px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            )}

            {!readonly && status === 'DRAFT' && (
              <>
                <button
                  type="button"
                  onClick={() => doSave('DRAFT')}
                  disabled={saving}
                  className="text-[12px] px-3 py-2 rounded-[6px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] disabled:opacity-50 transition-colors"
                >
                  Save draft
                </button>
                <button
                  type="button"
                  onClick={() => doSave('SCHEDULED')}
                  disabled={saving || !scheduledAt}
                  title={!scheduledAt ? 'Pick a scheduled-for time first' : undefined}
                  className="text-[12px] px-3 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] font-semibold disabled:opacity-50"
                >
                  Schedule
                </button>
              </>
            )}

            {!readonly && status === 'SCHEDULED' && (
              <>
                <button
                  type="button"
                  onClick={() => doSave('DRAFT')}
                  disabled={saving}
                  className="text-[12px] px-3 py-2 rounded-[6px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] disabled:opacity-50 transition-colors"
                >
                  Unschedule
                </button>
                <button
                  type="button"
                  onClick={() => doSave('SCHEDULED')}
                  disabled={saving}
                  className="text-[12px] px-3 py-2 rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] font-semibold disabled:opacity-50"
                >
                  Save changes
                </button>
              </>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

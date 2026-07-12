import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createVoucher, deleteVoucher, getVoucher, updateVoucher,
  type Voucher, type VoucherKind,
} from '../../api/vouchers';

const ANIM_MS = 220;

interface Props {
  /** null = new voucher (unsaved) */
  voucherId: string | null;
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

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function autoCode(): string {
  let out = '';
  for (let i = 0; i < 8; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}

/** Convert an ISO string to the local datetime-local input format. */
const dtLocalValue = (v: string | null | undefined) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Convert local datetime-local input back to an ISO string (or null). */
const isoFromLocal = (v: string): string | null => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

export function VoucherDrawer({ voucherId, onClose, onSaved, onToast }: Props) {
  const isNew = voucherId === null;

  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [code, setCode] = useState('');
  const [kind, setKind] = useState<VoucherKind>('PERCENT');
  const [value, setValue] = useState<number>(0);
  const [minOrderIdr, setMinOrderIdr] = useState<number>(0);
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [usageLimit, setUsageLimit] = useState<string>(''); // blank string = unlimited
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState('');

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
    getVoucher(voucherId as string)
      .then(v => {
        if (!active) return;
        setVoucher(v);
        setCode(v.code);
        setKind(v.kind);
        setValue(Number(v.value));
        setMinOrderIdr(Number(v.minOrderIdr));
        setStartsAt(dtLocalValue(v.startsAt));
        setExpiresAt(dtLocalValue(v.expiresAt));
        setUsageLimit(v.usageLimit == null ? '' : String(v.usageLimit));
        setActive(v.active);
        setNotes(v.notes ?? '');
      })
      .catch(() => { if (active) setError('Could not load this voucher.'); });
    return () => { active = false; };
  }, [voucherId, isNew]);

  const validate = (): string | null => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return 'Code is required.';
    if (!/^[A-Z0-9_-]{2,32}$/.test(trimmed)) return 'Code must be 2–32 chars: A–Z, 0–9, -, _.';
    if (kind === 'PERCENT' && (value < 0 || value > 100)) return 'Percent value must be 0–100.';
    if (kind === 'FIXED_IDR' && value < 0) return 'Fixed value must be ≥ 0.';
    return null;
  };

  const buildBody = () => {
    const limit = usageLimit.trim() === '' ? null : Math.max(0, Number(usageLimit));
    return {
      code: code.trim().toUpperCase(),
      kind,
      value: Number(value) || 0,
      minOrderIdr: Number(minOrderIdr) || 0,
      startsAt: isoFromLocal(startsAt),
      expiresAt: isoFromLocal(expiresAt),
      usageLimit: limit,
      active,
      notes: notes.trim() || null,
    };
  };

  const save = async () => {
    const err = validate();
    if (err) { onToast('err', err); return; }
    setSaving(true);
    try {
      if (isNew) {
        await createVoucher(buildBody());
        onToast('ok', 'Voucher created.');
      } else if (voucher) {
        await updateVoucher(voucher.id, buildBody());
        onToast('ok', 'Voucher updated.');
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
    if (!voucher) return;
    if (!confirm(`Delete voucher ${voucher.code}? This can't be undone.`)) return;
    try {
      await deleteVoucher(voucher.id);
      onToast('ok', 'Voucher deleted.');
      onSaved();
      close();
    } catch {
      onToast('err', 'Delete failed.');
    }
  };

  const doDisable = async () => {
    if (!voucher) return;
    try {
      await updateVoucher(voucher.id, { active: false });
      onToast('ok', 'Voucher disabled.');
      onSaved();
      close();
    } catch {
      onToast('err', 'Disable failed.');
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
        aria-label={voucher ? `Voucher ${voucher.code}` : 'New voucher'}
        className={`absolute right-0 top-0 h-full w-full max-w-[520px] bg-[var(--bg-base)] border-l border-[var(--border)] shadow-[0_8px_24px_rgba(0,0,0,.6)] flex flex-col transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-start gap-3 px-5 py-3.5 border-b border-[var(--border)] flex-shrink-0 bg-[var(--bg-surface)]">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {isNew ? 'New voucher' : 'Voucher'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <h2 className="font-mono text-[16px] font-semibold text-[var(--text-primary)]">
                {voucher?.code ?? code.trim().toUpperCase() ?? 'NEW'}
              </h2>
              {voucher && (
                <span className="text-[10px] text-[var(--text-muted)]">
                  {voucher.usageCount} use{voucher.usageCount === 1 ? '' : 's'}
                </span>
              )}
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
          {!error && !isNew && !voucher && <p className="mx-4 mb-4 text-[12px] text-[var(--text-faint)]">Loading…</p>}
          {(isNew || voucher) && !error && (
            <>
              <Section title="Code">
                <Field label="Code">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={code}
                      onChange={e => setCode(e.target.value.toUpperCase())}
                      placeholder="SUMMER25"
                      className="flex-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)] font-mono uppercase"
                    />
                    <button
                      type="button"
                      onClick={() => setCode(autoCode())}
                      className="text-[11px] px-2 py-1.5 rounded-[5px] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      Auto-generate
                    </button>
                  </div>
                </Field>
              </Section>

              <Section title="Discount">
                <Field label="Kind">
                  <div className="inline-flex bg-[var(--bg-surface)] border border-[var(--border)] rounded-[6px] p-[3px]">
                    {(['PERCENT', 'FIXED_IDR'] as const).map(k => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setKind(k)}
                        className={`text-[11px] font-medium px-3 py-1 rounded-[4px] transition-colors ${
                          kind === k
                            ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                        }`}
                      >
                        {k === 'PERCENT' ? 'Percent (%)' : 'Fixed (Rp)'}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label={kind === 'PERCENT' ? 'Value (%)' : 'Value (IDR)'}>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={kind === 'PERCENT' ? 100 : undefined}
                      value={value}
                      onChange={e => setValue(Number(e.target.value))}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)] font-mono pr-10 text-right"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-muted)] font-mono">
                      {kind === 'PERCENT' ? '%' : 'Rp'}
                    </span>
                  </div>
                </Field>

                <Field label="Minimum order value (IDR)">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={minOrderIdr}
                    onChange={e => setMinOrderIdr(Number(e.target.value))}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)] font-mono text-right"
                  />
                </Field>
              </Section>

              <Section title="Window">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Starts (optional)">
                    <input
                      type="datetime-local"
                      value={startsAt}
                      onChange={e => setStartsAt(e.target.value)}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
                    />
                  </Field>
                  <Field label="Expires (optional)">
                    <input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={e => setExpiresAt(e.target.value)}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
                    />
                  </Field>
                </div>
                <Field label="Usage limit (blank = unlimited)">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={usageLimit}
                    onChange={e => setUsageLimit(e.target.value)}
                    placeholder="∞"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)] font-mono text-right placeholder:text-[var(--text-faint)]"
                  />
                </Field>
              </Section>

              <Section title="Settings">
                <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={e => setActive(e.target.checked)}
                    className="accent-[var(--accent)]"
                  />
                  Active
                </label>
                <Field label="Notes (internal)">
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-[5px] px-2 py-1.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)] resize-none"
                  />
                </Field>
              </Section>
            </>
          )}
        </div>

        {(isNew || voucher) && !error && (
          <div className="border-t border-[var(--border)] px-4 py-3 flex items-center gap-2 flex-shrink-0 bg-[var(--bg-surface)] flex-wrap">
            {voucher && voucher.usageCount > 0 && (
              <button
                type="button"
                onClick={doDisable}
                disabled={saving || !voucher.active}
                className="text-[12px] px-3 py-2 rounded-[6px] border border-[var(--border)] text-[var(--danger)] hover:border-[var(--danger)] disabled:opacity-50 transition-colors"
              >
                Disable
              </button>
            )}
            {voucher && voucher.usageCount === 0 && (
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
              {saving ? 'Saving…' : isNew ? 'Create' : 'Save changes'}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

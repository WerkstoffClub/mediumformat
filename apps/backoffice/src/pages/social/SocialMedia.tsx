import { useEffect, useState } from 'react';
import {
  getListings,
  getSocialSettings,
  updateSocialSettings,
  type ListingsResponse,
  type SocialSettings,
} from '../../api/social';

const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

const SETUP_STEPS = [
  'Create a Meta Business Manager at business.facebook.com and a Facebook Page for Medium Format.',
  'Link your Instagram Business account (@handle below) to that Page.',
  'In Commerce Manager, create a catalogue → add items via Data Feed → paste the feed URL below, schedule Hourly.',
  'Enable Instagram Shopping on the IG account and tag products in posts — the Buy-Now message opens WhatsApp.',
  'Install WhatsApp Business on the shop phone with the number below, then connect the same catalogue to its Catalog.',
];

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-[var(--border-sub)] flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">{title}</h3>
        {note && <span className="text-[10px] text-[var(--text-faint)]">{note}</span>}
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full bg-[var(--bg-base)] border border-[var(--border)] rounded px-2.5 py-1.5 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--text-muted)]';

export function SocialMedia() {
  const [settings, setSettings] = useState<SocialSettings | null>(null);
  const [listings, setListings] = useState<ListingsResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getSocialSettings().then(setSettings).catch(() => setMessage({ kind: 'err', text: 'Could not load settings.' }));
    getListings().then(setListings).catch(() => {});
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateSocialSettings({
        waPhone: settings.waPhone || undefined,
        waTemplate: settings.waTemplate,
        igUsername: settings.igUsername || undefined,
        fbPageUrl: settings.fbPageUrl || undefined,
        storefrontUrlBase: settings.storefrontUrlBase || undefined,
        feedEnabled: settings.feedEnabled,
      });
      setSettings(updated);
      setMessage({ kind: 'ok', text: 'Saved.' });
      getListings().then(setListings).catch(() => {});
    } catch {
      setMessage({ kind: 'err', text: 'Save failed — check the values (URLs need https://, phone digits only).' });
    } finally {
      setSaving(false);
    }
  };

  const feedUrl = settings?.feedPath ? `${window.location.origin}${settings.feedPath}` : null;
  const copyFeed = async () => {
    if (!feedUrl) return;
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const set = <K extends keyof SocialSettings>(key: K, value: SocialSettings[K]) =>
    setSettings(s => (s ? { ...s, [key]: value } : s));

  const warningCount = listings?.items.reduce((n, i) => n + i.warnings.length, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[18px] font-black tracking-tight text-[var(--text-primary)]">Social Media</h1>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
          One Meta catalogue → Facebook Shop, Instagram tags & WhatsApp Business — Buy Now opens a WhatsApp chat
        </p>
      </div>

      {message && (
        <div className={`text-[11px] rounded-md px-3 py-2 border ${message.kind === 'ok' ? 'text-[var(--success)] border-[var(--success)]' : 'text-[var(--danger)] border-[var(--danger)]'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Panel title="Settings">
          {!settings ? (
            <p className="text-[11px] text-[var(--text-faint)]">Loading…</p>
          ) : (
            <div className="space-y-3">
              <Field label="WhatsApp Business number">
                <input className={inputCls} placeholder="0812-3456-7890" value={settings.waPhone ?? ''} onChange={e => set('waPhone', e.target.value)} />
              </Field>
              <Field label="Buy-Now message template — {artist} {title} {price}">
                <textarea className={`${inputCls} h-16 resize-none`} value={settings.waTemplate} onChange={e => set('waTemplate', e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Instagram handle">
                  <input className={inputCls} placeholder="mediumformat.jkt" value={settings.igUsername ?? ''} onChange={e => set('igUsername', e.target.value)} />
                </Field>
                <Field label="Facebook Page URL">
                  <input className={inputCls} placeholder="https://facebook.com/…" value={settings.fbPageUrl ?? ''} onChange={e => set('fbPageUrl', e.target.value)} />
                </Field>
              </div>
              <Field label="Storefront product URL base (optional — replaces WhatsApp links once the store is live)">
                <input className={inputCls} placeholder="https://mediumformat.info/release" value={settings.storefrontUrlBase ?? ''} onChange={e => set('storefrontUrlBase', e.target.value)} />
              </Field>
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-[11.5px] text-[var(--text-secondary)]">
                  <input type="checkbox" checked={settings.feedEnabled} onChange={e => set('feedEnabled', e.target.checked)} />
                  Feed enabled
                </label>
                <button
                  onClick={save}
                  disabled={saving}
                  className="text-[11px] px-3.5 py-1.5 rounded-md bg-[var(--text-primary)] text-[var(--bg-base)] font-semibold disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save settings'}
                </button>
              </div>
            </div>
          )}
        </Panel>

        <div className="space-y-3">
          <Panel title="Catalogue feed" note={listings ? `${listings.exportedCount} products exported` : undefined}>
            {feedUrl ? (
              <div className="space-y-2">
                <div className="flex gap-1.5">
                  <input readOnly value={feedUrl} className={`${inputCls} font-mono text-[10.5px]`} onFocus={e => e.target.select()} />
                  <button onClick={copyFeed} className="text-[10px] px-2.5 rounded border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap">
                    {copied ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
                <p className="text-[10px] text-[var(--text-faint)]">
                  Paste into Meta Commerce Manager → Data sources → Data feed → Scheduled (hourly).
                  {warningCount > 0 && <span className="text-[var(--warning)]"> {warningCount} item warning{warningCount > 1 ? 's' : ''} below.</span>}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-[var(--danger)]">SOCIAL_FEED_TOKEN is not set on the API server — the feed URL cannot be generated.</p>
            )}
          </Panel>

          <Panel title="One-time Meta setup">
            <ol className="space-y-1.5 list-decimal list-inside">
              {SETUP_STEPS.map(step => (
                <li key={step} className="text-[11px] leading-snug text-[var(--text-secondary)]">{step}</li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>

      <Panel title="Listings" note="what the feed exports">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Release', 'Price', 'Stock', 'Cond.', 'Warnings', ''].map(header => (
                  <th key={header} className="text-left text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)] font-semibold pb-1.5">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(!listings || listings.items.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-2 text-[11px] text-[var(--text-faint)] border-t border-[var(--border-sub)]">
                    No releases yet — run a DealPOS sync to populate inventory, and the feed follows.
                  </td>
                </tr>
              )}
              {listings?.items.map(item => (
                <tr key={item.releaseId}>
                  <td className="py-1.5 text-[11.5px] border-t border-[var(--border-sub)] max-w-[280px] truncate" title={item.title}>{item.title}</td>
                  <td className="py-1.5 text-[11.5px] border-t border-[var(--border-sub)] font-mono text-right">{idr.format(item.priceIdr)}</td>
                  <td className="py-1.5 text-[11.5px] border-t border-[var(--border-sub)] font-mono text-right">{item.stock}</td>
                  <td className="py-1.5 text-[11.5px] border-t border-[var(--border-sub)]">{item.condition}</td>
                  <td className="py-1.5 text-[10.5px] border-t border-[var(--border-sub)] text-[var(--warning)]">{item.warnings.join('; ')}</td>
                  <td className="py-1.5 text-[11px] border-t border-[var(--border-sub)] text-right">
                    {item.waPreviewUrl && (
                      <a href={item.waPreviewUrl} target="_blank" rel="noreferrer" className="text-[var(--text-secondary)] underline hover:text-[var(--text-primary)]">
                        WA preview
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

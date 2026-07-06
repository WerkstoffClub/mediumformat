import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { aiAssist, createRelease, getRelease, updateRelease, type AssistKind } from '../../api/inventory';
import { fmtIdr } from '../../api/ops';
import type { Release } from '@mf/shared';
import { ReleaseCover } from '../../components/ui/Cover';

const LOW_AT = 2;
const condLabel = (c?: string | null) => (c === 'VGP' ? 'VG+' : c === 'GP' ? 'G+' : c ?? null);
const fmtFormat = (f?: string | null) =>
  ({ TWO_LP: '2×LP', THREE_LP: '3×LP', TWELVE_INCH: '12"', SEVEN_INCH: '7"', TWO_CD: '2×CD' } as Record<string, string>)[f ?? ''] ?? f ?? null;

type Track = { no?: string; title: string; duration?: string; previewUrl?: string; previewSource?: string };
type SizeRow = { size: string; chest?: string; length?: string };

/* Only what the API accepts — the fetched Release also carries read-only
   fields (id, dealpos ids, timestamps) that must not be PATCHed back. */
const EDITABLE: Array<keyof Release> = [
  'artist', 'title', 'label', 'catNumber', 'year', 'country', 'format', 'genre', 'barcode',
  'condition', 'mediaGrade', 'sleeveGrade', 'priceIdr', 'compareAtIdr', 'costIdr',
  'stock', 'storeLocation', 'shelfLocation', 'lowStockThreshold', 'imageUrl', 'notes',
  'slug', 'seoTitle', 'seoDescription', 'featured', 'preorder', 'preorderEta', 'onSale',
];

/* API expects the Prisma enum values; labels follow the prototype */
const FORMATS = [
  ['LP', 'LP'], ['TWO_LP', '2×LP'], ['THREE_LP', '3×LP'], ['TWELVE_INCH', '12" single'],
  ['SEVEN_INCH', '7" single'], ['CD', 'CD'], ['TWO_CD', '2×CD'], ['CASSETTE', 'Cassette'], ['MERCH', 'Merch'],
] as const;
const CONDITIONS = [['M', 'M'], ['VGP', 'VG+'], ['VG', 'VG'], ['GP', 'G+'], ['G', 'G'], ['F', 'F'], ['P', 'P']] as const;
const LOCATIONS = [['MAIN_STORE', 'Main Store'], ['WAREHOUSE', 'Warehouse'], ['CONSIGNMENT', 'Consignment']] as const;
const PREVIEW_SOURCES = ['Bandcamp', 'Spotify', 'Apple Music', 'YouTube', 'SoundCloud'] as const;
const CHANNELS = [
  ['website', 'Website', 'goes live with the storefront'],
  ['pos', 'POS', 'in-store'],
  ['tokopedia', 'Tokopedia', 'via marketplace listing'],
  ['shopee', 'Shopee', 'via marketplace listing'],
  ['discogs', 'Discogs', 'not connected yet'],
] as const;

const inputCls = 'w-full bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[6px] px-3 py-[9px] text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]';

function Field({ label, required, children, htmlFor, aiButton }: {
  label: string; required?: boolean; children: React.ReactNode; htmlFor?: string; aiButton?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={htmlFor} className="block text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-[0.04em]">
          {label}{required && <span className="text-[var(--danger)] ml-0.5">*</span>}
        </label>
        {aiButton}
      </div>
      {children}
    </div>
  );
}

function AiButton({ busy, onClick, small }: { busy: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-1 rounded-[5px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] disabled:opacity-50 transition-colors ${small ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-1'}`}
    >
      <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><path d="M12 2l1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7z"/></svg>
      {busy ? '…' : 'AI assist'}
    </button>
  );
}

/** Mockup's numbered section: raised header bar with an index circle. */
function Section({ n, title, note, action, children }: {
  n: string; title: string; note?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-[var(--bg-overlay)] border-b border-[var(--border)]">
        <span className="w-[22px] h-[22px] rounded-full border border-[var(--border)] bg-[var(--bg-surface)] text-[11px] font-semibold text-[var(--text-primary)] flex items-center justify-center [font-variant-numeric:tabular-nums] flex-shrink-0">{n}</span>
        <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--text-primary)] flex-1">{title}</span>
        {note && <span className="text-[11px] text-[var(--text-muted)] normal-case">{note}</span>}
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-[23px] rounded-full border flex-shrink-0 transition-colors ${checked ? 'bg-[var(--accent)] border-[var(--accent)]' : 'bg-[var(--bg-overlay)] border-[var(--border)]'}`}
    >
      <span className={`absolute top-[3px] left-[3px] w-[15px] h-[15px] rounded-full transition-transform ${checked ? 'translate-x-[17px] bg-[var(--accent-text)]' : 'bg-[var(--text-muted)]'}`} />
    </button>
  );
}

export function ReleaseForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<Partial<Release>>({
    format: 'LP' as Release['format'], condition: 'M', priceIdr: 0, stock: 0,
    storeLocation: 'MAIN_STORE', lowStockThreshold: 2,
  });
  const [tracks, setTracks] = useState<Track[]>([]);
  const [sizing, setSizing] = useState<SizeRow[]>([]);
  const [channels, setChannels] = useState<string[]>(['website', 'pos']);
  const [openTrack, setOpenTrack] = useState<number | null>(null);
  const [aiBusy, setAiBusy] = useState<AssistKind | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && id) {
      getRelease(id).then(r => {
        setForm(r);
        setTracks((r.tracks as Track[] | null) ?? []);
        setSizing((r.sizing as SizeRow[] | null) ?? []);
        setChannels((r.channelListings as string[] | null) ?? ['website', 'pos']);
      }).catch(() => navigate('/inventory'));
    }
  }, [id, isEdit, navigate]);

  const set = (field: keyof Release) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const numFields = ['priceIdr', 'costIdr', 'compareAtIdr', 'stock', 'year', 'lowStockThreshold'];
      const value = numFields.includes(field as string) ? Number(e.target.value) || 0 : e.target.value;
      setForm(f => ({ ...f, [field]: value }));
    };
  const setFlag = (field: 'featured' | 'preorder' | 'onSale') => (v: boolean) => setForm(f => ({ ...f, [field]: v }));

  const runAi = async (kind: AssistKind, target: keyof Release) => {
    setAiBusy(kind);
    try {
      const text = await aiAssist(kind, form);
      setForm(f => ({ ...f, [target]: text }));
    } catch {
      setError('AI assist unavailable — check OPENROUTER_API_KEY on the server.');
    } finally {
      setAiBusy(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const payload: Partial<Release> = {
      tracks: tracks.filter(t => t.title.trim()),
      sizing: form.format === 'MERCH' ? sizing.filter(s => s.size.trim()) : [],
      channelListings: channels,
    };
    for (const key of EDITABLE) {
      const value = form[key];
      if (value !== undefined && value !== null && value !== '') (payload as Record<string, unknown>)[key] = value;
    }
    if (payload.preorderEta) payload.preorderEta = new Date(String(payload.preorderEta)).toISOString();
    try {
      if (isEdit && id) await updateRelease(id, payload);
      else await createRelease(payload);
      navigate('/inventory');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to save release.'));
    } finally {
      setLoading(false);
    }
  };

  const release = form as Release;
  const patchTrack = (i: number, patch: Partial<Track>) =>
    setTracks(list => list.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  const stock = Number(form.stock ?? 0);
  const stockState = stock === 0 ? 'out' : stock <= (form.lowStockThreshold ?? LOW_AT) ? 'low' : 'in';
  const stockPill = {
    in:  ['In stock', 'text-[var(--success)] bg-[var(--success-t)]'],
    low: ['Low stock', 'text-[var(--warning)] bg-[var(--warning-t)]'],
    out: ['Out of stock', 'text-[var(--danger)] bg-[var(--danger-t)]'],
  }[stockState];
  const metaBits = [form.catNumber, fmtFormat(form.format), form.year ? String(form.year) : null].filter(Boolean);
  const flags = [
    form.featured && 'Featured', form.preorder && 'Pre-order', form.onSale && 'On sale',
  ].filter(Boolean) as string[];

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl pb-20">
      {/* page header — a live identity card that fills in as you edit */}
      <div className="mb-5">
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mb-3">
          <Link to="/inventory" className="hover:text-[var(--text-primary)]">Inventory</Link>
          <span className="text-[var(--text-faint)]">/</span>
          <span className="text-[var(--text-secondary)]">{isEdit ? 'Edit release' : 'Add release'}</span>
        </div>

        <div className="flex items-start gap-4 max-sm:flex-col">
          <span className="w-[68px] h-[68px] rounded-[8px] overflow-hidden border border-[var(--border)] flex-shrink-0">
            <ReleaseCover imageUrl={form.imageUrl} format={form.format} alt="Cover preview" />
          </span>

          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-semibold tracking-[-0.03em] leading-7 text-[var(--text-primary)] truncate">
              {release.artist || (isEdit ? 'Untitled release' : 'Add release')}
            </h1>
            <p className="text-[14px] text-[var(--text-secondary)] leading-tight truncate mt-0.5">
              {release.title || (isEdit ? '—' : 'New release for the catalogue')}
            </p>
            <div className="flex items-center gap-x-2.5 gap-y-1.5 flex-wrap mt-2.5">
              {metaBits.length > 0 && (
                <span className="font-mono text-[11px] text-[var(--text-muted)]">{metaBits.join(' · ')}</span>
              )}
              {condLabel(form.condition) && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)]">{condLabel(form.condition)}</span>
              )}
              {isEdit && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${stockPill[1]}`}>
                  {stockPill[0]} · <span className="font-mono">{stock}</span>
                </span>
              )}
              {flags.map(f => (
                <span key={f} className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-muted)]">{f}</span>
              ))}
            </div>
          </div>

          <div className="text-right flex-shrink-0 max-sm:text-left">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Price</p>
            <p className="font-mono text-[19px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] leading-none mt-1.5">
              {form.priceIdr ? fmtIdr(form.priceIdr) : '—'}
            </p>
          </div>
        </div>

        {isEdit && release.dealposVariantId && (
          <p className="text-[12px] text-[var(--text-muted)] mt-3">
            Synced from DealPOS · variant <span className="font-mono text-[11px]">{release.dealposVariantId}</span>
          </p>
        )}
      </div>

      {error && <div className="text-[12px] text-[var(--danger)] border border-[var(--danger)] rounded-md px-3 py-2 mb-4">{error}</div>}

      <div className="space-y-4">
        <Section n="1" title="Basics">
          <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
            <Field label="Artist" required htmlFor="artist"><input id="artist" className={inputCls} value={form.artist ?? ''} onChange={set('artist')} required /></Field>
            <Field label="Title" required htmlFor="title"><input id="title" className={inputCls} value={form.title ?? ''} onChange={set('title')} required /></Field>
            <Field label="Label" htmlFor="label"><input id="label" className={inputCls} value={form.label ?? ''} onChange={set('label')} /></Field>
            <div className="grid grid-cols-3 gap-3.5">
              <Field label="Cat. number" htmlFor="cat"><input id="cat" className={`${inputCls} font-mono`} value={form.catNumber ?? ''} onChange={set('catNumber')} /></Field>
              <Field label="Year" htmlFor="year"><input id="year" type="number" min={1900} max={2099} className={`${inputCls} font-mono`} value={form.year ?? ''} onChange={set('year')} /></Field>
              <Field label="Country" htmlFor="country"><input id="country" className={inputCls} value={form.country ?? ''} onChange={set('country')} placeholder="e.g. UK" /></Field>
            </div>
          </div>
        </Section>

        <Section n="2" title="Format & condition">
          <div className="grid grid-cols-3 gap-3.5 max-md:grid-cols-1">
            <Field label="Format" required htmlFor="format">
              <select id="format" className={inputCls} value={form.format} onChange={set('format')}>
                {FORMATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Genre" htmlFor="genre"><input id="genre" className={inputCls} value={form.genre ?? ''} onChange={set('genre')} placeholder="e.g. Vinyl Import" /></Field>
            <Field label="Barcode" htmlFor="barcode"><input id="barcode" className={`${inputCls} font-mono`} value={form.barcode ?? ''} onChange={set('barcode')} placeholder="EAN-13 / Code128" /></Field>
          </div>
          <div className="grid grid-cols-[1fr_180px_180px] gap-3.5 mt-3.5 max-md:grid-cols-1 items-end">
            <Field label="Condition grade" required>
              <div className="flex gap-1.5 flex-wrap">
                {CONDITIONS.map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, condition: v as Release['condition'] }))}
                    className={`text-[12px] font-mono px-3.5 py-1.5 rounded-full border transition-colors ${
                      form.condition === v ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Media grade" htmlFor="media">
              <select id="media" className={inputCls} value={form.mediaGrade ?? ''} onChange={set('mediaGrade')}>
                <option value="">—</option>
                {CONDITIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Sleeve grade" htmlFor="sleeve">
              <select id="sleeve" className={inputCls} value={form.sleeveGrade ?? ''} onChange={set('sleeveGrade')}>
                <option value="">—</option>
                {CONDITIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
          </div>
        </Section>

        <Section n="3" title="Pricing" note="IDR · incl. PPN 11%">
          <div className="grid grid-cols-4 gap-3.5 max-md:grid-cols-2">
            {([['Price', 'priceIdr', true], ['Compare-at', 'compareAtIdr', false], ['Cost (COGS)', 'costIdr', false]] as const).map(([label, field, required]) => (
              <Field key={field} label={label} required={required} htmlFor={field}>
                <div className="flex items-center bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[6px] focus-within:border-[var(--accent)]">
                  <span className="pl-3 text-[12px] text-[var(--text-muted)]">Rp</span>
                  <input id={field} type="number" min={0} className="w-full bg-transparent px-2 py-[9px] text-[13px] font-mono text-[var(--text-primary)] outline-none" value={(form[field] as number | null) ?? ''} onChange={set(field)} required={required} />
                </div>
              </Field>
            ))}
            <Field label="Margin">
              <div className="px-1 py-[9px] text-[13px] font-mono text-[var(--text-secondary)] [font-variant-numeric:tabular-nums]">
                {form.priceIdr && form.costIdr ? `${(((form.priceIdr - form.costIdr) / form.priceIdr) * 100).toFixed(1)}%` : '—'}
              </div>
            </Field>
          </div>
          {form.compareAtIdr ? (
            <p className="text-[11px] text-[var(--text-muted)] mt-2.5">Compare-at shows struck-through on the storefront when On-sale (section 9) is enabled.</p>
          ) : null}
        </Section>

        <Section n="4" title="Stock & location">
          <div className="grid grid-cols-[1fr_120px_100px_110px] gap-3.5 items-end max-md:grid-cols-2">
            <Field label="Location" htmlFor="loc">
              <select id="loc" className={inputCls} value={form.storeLocation} onChange={set('storeLocation')}>
                {LOCATIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Shelf" htmlFor="shelf"><input id="shelf" className={`${inputCls} font-mono`} value={form.shelfLocation ?? ''} onChange={set('shelfLocation')} placeholder="e.g. A3" /></Field>
            <Field label="Qty" htmlFor="qty"><input id="qty" type="number" min={0} className={`${inputCls} font-mono`} value={form.stock ?? 0} onChange={set('stock')} /></Field>
            <Field label="Low-stock at" htmlFor="threshold"><input id="threshold" type="number" min={0} className={`${inputCls} font-mono`} value={form.lowStockThreshold ?? 2} onChange={set('lowStockThreshold')} /></Field>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-3">Stock refreshes from DealPOS on every sync; per-location allocation arrives with the multi-location phase.</p>
        </Section>

        <Section n="5" title="Channels" note="Where this release is listed">
          <div className="space-y-1.5">
            {CHANNELS.map(([key, name, meta]) => {
              const on = channels.includes(key);
              return (
                <label key={key} className="flex items-center gap-3 px-2.5 py-2 rounded-[6px] hover:bg-[var(--bg-overlay)] cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    onChange={() => setChannels(list => (on ? list.filter(c => c !== key) : [...list, key]))}
                  />
                  <span className={`w-[18px] h-[18px] rounded-[4px] border flex items-center justify-center flex-shrink-0 ${on ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-text)]' : 'border-[var(--border)] text-transparent'}`}>
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                  <span className="text-[13px] text-[var(--text-primary)] flex-1">{name}</span>
                  <span className="text-[11px] text-[var(--text-muted)]">{key === 'website' && form.priceIdr ? `Rp ${Number(form.priceIdr).toLocaleString('id-ID')}` : meta}</span>
                </label>
              );
            })}
          </div>
        </Section>

        <Section n="6" title="Media">
          <div className="grid grid-cols-[128px_1fr] gap-4 max-md:grid-cols-1">
            <div>
              <p className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-[0.04em] mb-1.5">Cover art</p>
              <span className="w-[128px] h-[128px] rounded-[8px] block overflow-hidden border border-[var(--border)]">
                <ReleaseCover imageUrl={form.imageUrl} format={form.format} alt="Cover preview" />
              </span>
              <input className={`${inputCls} font-mono text-[10.5px] mt-2`} value={form.imageUrl ?? ''} onChange={set('imageUrl')} placeholder="https://…" aria-label="Cover art URL" />
              <p className="text-[10px] text-[var(--text-faint)] mt-1.5">JPG / PNG · square · ≥ 1000px</p>
            </div>
            <div>
              <p className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-[0.04em] mb-1.5">Tracklist</p>
              <div className="space-y-1.5">
                {tracks.map((track, i) => (
                  <div key={i} className="border border-[var(--border)] rounded-[6px] overflow-hidden">
                    <div className="flex items-center gap-2 p-1.5">
                      <input className="w-11 bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[5px] px-1.5 py-[7px] text-[11px] font-mono text-center text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]" value={track.no ?? ''} onChange={e => patchTrack(i, { no: e.target.value })} placeholder={`${i + 1}`} aria-label="Track number" />
                      <input className="flex-1 bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[5px] px-2.5 py-[7px] text-[12.5px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" value={track.title} onChange={e => patchTrack(i, { title: e.target.value })} placeholder="Track title" aria-label="Track title" />
                      <input className="w-[64px] bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[5px] px-1.5 py-[7px] text-[11px] font-mono text-center text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]" value={track.duration ?? ''} onChange={e => patchTrack(i, { duration: e.target.value })} placeholder="0:00" aria-label="Duration" />
                      <button
                        type="button"
                        onClick={() => setOpenTrack(openTrack === i ? null : i)}
                        title="Audio preview"
                        aria-label="Audio preview"
                        className={`w-8 h-8 rounded-[5px] flex items-center justify-center flex-shrink-0 transition-colors ${track.previewUrl ? 'text-[var(--success)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.7}><circle cx="12" cy="12" r="9"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>
                      </button>
                      <button type="button" onClick={() => setTracks(list => list.filter((_, j) => j !== i))} aria-label="Remove track" className="w-8 h-8 rounded-[5px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)] flex-shrink-0">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </button>
                    </div>
                    {openTrack === i && (
                      <div className="border-t border-[var(--border)] p-3 bg-[var(--bg-overlay)]">
                        <p className="text-[11px] text-[var(--text-muted)] mb-2">Audio preview — link a source; the storefront plays a ~30-second preview.</p>
                        <div className="flex gap-1.5 flex-wrap mb-2">
                          {PREVIEW_SOURCES.map(src => (
                            <button
                              key={src}
                              type="button"
                              onClick={() => patchTrack(i, { previewSource: src })}
                              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${track.previewSource === src ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'}`}
                            >
                              {src}
                            </button>
                          ))}
                        </div>
                        <input
                          className={`${inputCls} font-mono text-[11px] bg-[var(--bg-surface)]`}
                          value={track.previewUrl ?? ''}
                          onChange={e => patchTrack(i, { previewUrl: e.target.value })}
                          placeholder={`Paste ${track.previewSource ?? 'a'} track link…`}
                          aria-label="Preview URL"
                        />
                        {track.previewUrl && (
                          <p className="text-[11px] text-[var(--success)] mt-2 flex items-center gap-1.5">
                            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            Preview linked{track.previewSource ? ` from ${track.previewSource}` : ''}
                            <button type="button" className="underline text-[var(--text-muted)] ml-1" onClick={() => patchTrack(i, { previewUrl: '', previewSource: undefined })}>Remove</button>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setTracks(list => [...list, { no: `${list.length + 1}`, title: '' }])}
                className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add track
              </button>
            </div>
          </div>
        </Section>

        {form.format === 'MERCH' && (
          <Section n="↕" title="Sizing guide" note="Shown for apparel & merchandise">
            <div className="space-y-1.5">
              <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 text-[10px] uppercase tracking-[0.05em] text-[var(--text-muted)] font-medium px-0.5">
                <span>Size</span><span>Chest (cm)</span><span>Length (cm)</span><span />
              </div>
              {sizing.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 items-center">
                  <input className={inputCls} value={row.size} onChange={e => setSizing(l => l.map((r, j) => j === i ? { ...r, size: e.target.value } : r))} aria-label="Size" />
                  <input className={`${inputCls} font-mono`} value={row.chest ?? ''} onChange={e => setSizing(l => l.map((r, j) => j === i ? { ...r, chest: e.target.value } : r))} aria-label="Chest cm" />
                  <input className={`${inputCls} font-mono`} value={row.length ?? ''} onChange={e => setSizing(l => l.map((r, j) => j === i ? { ...r, length: e.target.value } : r))} aria-label="Length cm" />
                  <button type="button" onClick={() => setSizing(l => l.filter((_, j) => j !== i))} aria-label="Remove size" className="w-8 h-8 rounded-[5px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)]">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setSizing(l => [...l, { size: '' }])} className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add size
              </button>
            </div>
          </Section>
        )}

        <Section n="7" title="Description" action={<AiButton busy={aiBusy === 'desc'} onClick={() => runAi('desc', 'notes')} />}>
          <Field label="Storefront description" htmlFor="desc">
            <textarea id="desc" className={`${inputCls} min-h-[96px] resize-y`} value={form.notes ?? ''} onChange={set('notes')} placeholder="Tell the story of this record…" />
          </Field>
        </Section>

        <Section n="8" title="SEO" note="Search & social preview">
          <div className="space-y-3.5">
            <Field label="URL slug" htmlFor="slug">
              <div className="flex items-center bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[6px] focus-within:border-[var(--accent)]">
                <span className="pl-3 text-[12px] text-[var(--text-muted)] font-mono whitespace-nowrap">/release/</span>
                <input id="slug" className="w-full bg-transparent px-2 py-[9px] text-[13px] text-[var(--text-primary)] outline-none" value={form.slug ?? ''} onChange={set('slug')} placeholder="artist-title" />
              </div>
            </Field>
            <Field label="Meta title" htmlFor="metatitle" aiButton={<AiButton small busy={aiBusy === 'metatitle'} onClick={() => runAi('metatitle', 'seoTitle')} />}>
              <input id="metatitle" className={inputCls} value={form.seoTitle ?? ''} onChange={set('seoTitle')} maxLength={70} placeholder="Artist — Title (LP) | Medium Format" />
            </Field>
            <Field label="Meta description" htmlFor="metadesc" aiButton={<AiButton small busy={aiBusy === 'metadesc'} onClick={() => runAi('metadesc', 'seoDescription')} />}>
              <textarea id="metadesc" className={`${inputCls} min-h-[72px] resize-y`} value={form.seoDescription ?? ''} onChange={set('seoDescription')} maxLength={170} />
            </Field>
          </div>
        </Section>

        <Section n="9" title="Merchandising" note="Storefront placement & promotion">
          <div className="divide-y divide-[var(--border-sub)]">
            <div className="flex items-center gap-4 py-3 first:pt-0.5">
              <div className="flex-1">
                <p className="text-[13px] font-medium text-[var(--text-primary)]">Featured</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Show in the homepage featured slider and category hero placements.</p>
              </div>
              <Switch checked={form.featured ?? false} onChange={setFlag('featured')} />
            </div>
            <div className="py-3">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-[var(--text-primary)]">Pre-order</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">List before release with an estimated delivery date shown to customers.</p>
                </div>
                <Switch checked={form.preorder ?? false} onChange={setFlag('preorder')} />
              </div>
              {form.preorder && (
                <div className="mt-3 max-w-[240px]">
                  <Field label="Estimated delivery" htmlFor="preorder-eta">
                    <input id="preorder-eta" type="date" className={`${inputCls} font-mono`} value={form.preorderEta ? String(form.preorderEta).slice(0, 10) : ''} onChange={set('preorderEta')} />
                  </Field>
                  <p className="text-[10px] text-[var(--text-faint)] mt-1.5">Shown as "Pre-order · Ships …" on the release page.</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 py-3 last:pb-0.5">
              <div className="flex-1">
                <p className="text-[13px] font-medium text-[var(--text-primary)]">On-sale</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Enable to show the struck-through Compare-at price (section 3) on the storefront.</p>
              </div>
              <Switch checked={form.onSale ?? false} onChange={setFlag('onSale')} />
            </div>
          </div>
        </Section>
      </div>

      {/* sticky footer bar — floats over the form (Level 2) */}
      <div className="fixed bottom-0 left-[232px] right-0 max-md:left-0 z-30 bg-[var(--bg-surface)] border-t border-[var(--border)] shadow-[0_-4px_12px_rgba(0,0,0,0.28)]">
        <div className="max-w-3xl flex items-center gap-3 px-6 max-md:px-4 py-3">
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <span className={`w-1.5 h-1.5 rounded-full ${isEdit ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]'}`} />
            {isEdit ? 'Editing saved release' : 'New release'}
          </span>
          <span className="flex-1" />
          <Link to="/inventory" className="px-3.5 py-[9px] rounded-[6px] text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] transition-colors">Cancel</Link>
          <button type="submit" disabled={loading} className="inline-flex items-center gap-1.5 px-4 py-[9px] rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] text-[13px] font-semibold hover:opacity-[.88] disabled:opacity-50 transition-opacity">
            {!loading && <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>}
            {loading ? 'Saving…' : 'Save release'}
          </button>
        </div>
      </div>
    </form>
  );
}

import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Release } from '@mf/shared';
import { aiAssist, createRelease, getRelease, updateRelease, type AssistKind } from '../../api/inventory';
import { fmtIdr } from '../../api/ops';
import { ReleaseCover } from '../../components/ui/Cover';
import { Basics } from './release-edit/Basics';
import { Channels } from './release-edit/Channels';
import { Description } from './release-edit/Description';
import { FormatCondition } from './release-edit/FormatCondition';
import { Media } from './release-edit/Media';
import { Merchandising } from './release-edit/Merchandising';
import { Pricing } from './release-edit/Pricing';
import { Seo } from './release-edit/Seo';
import { StockLocation } from './release-edit/StockLocation';
import { condLabel, fmtFormat } from './release-edit/shared';
import type { ReleaseFormState, Track } from './release-edit/types';

const LOW_AT = 2;

/* Only what the API accepts — the fetched Release also carries read-only
   fields (id, dealpos ids, timestamps) that must not be PATCHed back. */
const EDITABLE: Array<keyof Release> = [
  'artist', 'title', 'label', 'catNumber', 'year', 'country', 'format', 'genre', 'barcode',
  'condition', 'mediaGrade', 'sleeveGrade', 'priceIdr', 'compareAtIdr', 'costIdr',
  'stock', 'storeLocation', 'shelfLocation', 'lowStockThreshold', 'imageUrl', 'notes',
  'slug', 'seoTitle', 'seoDescription', 'featured', 'preorder', 'preorderEta', 'onSale',
  'discogsId',
];

/** Legacy track rows use `{ no, previewUrl, previewSource }`; the new shape uses
    `{ position, previews: { ... } }`. Normalise on load, preserving both when
    possible so downstream code can still read the old fields if they exist. */
function normaliseTrack(row: unknown): Track {
  const r = (row ?? {}) as {
    position?: string; no?: string;
    title?: string;
    duration?: string;
    previewUrl?: string; previewSource?: string;
    previews?: Track['previews'];
  };
  const previews: Track['previews'] = { ...(r.previews ?? {}) };
  if (!previews.apple && !previews.bandcamp && !previews.soundcloud &&
      !previews.upload && r.previewUrl) {
    // Best-effort mapping of legacy single-URL previews into the new shape.
    const src = (r.previewSource ?? '').toLowerCase();
    if (src.includes('apple')) previews.apple = r.previewUrl;
    else if (src.includes('bandcamp')) previews.bandcamp = r.previewUrl;
    else if (src.includes('soundcloud')) previews.soundcloud = r.previewUrl;
    else previews.upload = r.previewUrl;
  }
  return {
    position: r.position ?? r.no ?? '',
    title: r.title ?? '',
    duration: r.duration,
    previews,
  };
}

/** Persist tracks in a shape both the current backend and any legacy consumer
    can read: keep `position` (new) alongside `no` (legacy), and drop empty
    `previews` objects to keep payloads clean. */
function serialiseTrack(t: Track): Record<string, unknown> {
  const previews = t.previews ?? {};
  const hasAnyPreview =
    !!(previews.apple || previews.bandcamp || previews.soundcloud ||
       previews.upload);
  const out: Record<string, unknown> = {
    position: t.position,
    no: t.position, // legacy compat
    title: t.title,
  };
  if (t.duration) out.duration = t.duration;
  if (hasAnyPreview) out.previews = previews;
  return out;
}

export function ReleaseForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<ReleaseFormState>({
    format: 'LP',
    condition: 'M',
    priceIdr: 0,
    stock: 0,
    storeLocation: 'MAIN_STORE',
    lowStockThreshold: 2,
    tracks: [],
    sizing: [],
    channelListings: ['website', 'pos'],
    gallery: [],
  });
  const [aiBusy, setAiBusy] = useState<AssistKind | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && id) {
      getRelease(id).then(r => {
        const raw = r as Release & { gallery?: unknown };
        setForm({
          ...r,
          tracks: Array.isArray(raw.tracks) ? raw.tracks.map(normaliseTrack) : [],
          sizing: (raw.sizing as ReleaseFormState['sizing']) ?? [],
          channelListings: (raw.channelListings as string[] | null) ?? ['website', 'pos'],
          gallery: Array.isArray(raw.gallery) ? (raw.gallery as string[]) : [],
        });
      }).catch(() => navigate('/inventory'));
    }
  }, [id, isEdit, navigate]);

  const patch = (p: Partial<ReleaseFormState>) => setForm(f => ({ ...f, ...p }));

  const runAi = async (kind: AssistKind, target: 'notes' | 'seoTitle' | 'seoDescription') => {
    setAiBusy(kind);
    try {
      const text = await aiAssist(kind, form as Partial<Release>);
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

    const cleanTracks = (form.tracks ?? []).filter(t => t.title.trim()).map(serialiseTrack);
    const cleanSizing = form.format === 'MERCH'
      ? (form.sizing ?? []).filter(s => s.size.trim())
      : [];

    const payload: Partial<Release> & { gallery?: string[] } = {
      tracks: cleanTracks as unknown as Release['tracks'],
      sizing: cleanSizing,
      channelListings: form.channelListings ?? [],
    };

    for (const key of EDITABLE) {
      const value = form[key as keyof ReleaseFormState];
      if (value !== undefined && value !== null && value !== '') {
        (payload as Record<string, unknown>)[key] = value;
      }
    }

    if ((form.gallery?.length ?? 0) > 0) {
      payload.gallery = form.gallery;
    }

    if (payload.preorderEta) {
      payload.preorderEta = new Date(String(payload.preorderEta)).toISOString();
    }

    try {
      if (isEdit && id) await updateRelease(id, payload as Partial<Release>);
      else await createRelease(payload as Partial<Release>);
      navigate('/inventory');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to save release.'));
    } finally {
      setLoading(false);
    }
  };

  const stock = Number(form.stock ?? 0);
  const stockState = stock === 0 ? 'out' : stock <= (form.lowStockThreshold ?? LOW_AT) ? 'low' : 'in';
  const stockPill = {
    in:  ['In stock', 'text-[var(--success)] bg-[var(--success-t)]'],
    low: ['Low stock', 'text-[var(--warning)] bg-[var(--warning-t)]'],
    out: ['Out of stock', 'text-[var(--danger)] bg-[var(--danger-t)]'],
  }[stockState];
  const metaBits = [form.catNumber, fmtFormat(form.format), form.year ? String(form.year) : null].filter(Boolean);
  const flags = [
    form.featured && 'Featured',
    form.preorder && 'Pre-order',
    form.onSale && 'On sale',
  ].filter(Boolean) as string[];

  return (
    <form onSubmit={handleSubmit} className="pb-20">
      <div className="mx-auto w-full max-w-[940px] px-6 py-8 max-md:px-4 max-md:py-6">
        {/* page header — a live identity card that fills in as you edit */}
        <div className="mb-5">
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mb-3">
            <Link to="/inventory" className="hover:text-[var(--text-primary)]">Inventory</Link>
            <span className="text-[var(--text-faint)]">/</span>
            <span className="text-[var(--text-secondary)]">
              {isEdit ? 'Edit release' : 'Add release'}
            </span>
          </div>

          <div className="flex items-start gap-4 max-sm:flex-col">
            <span className="w-[68px] h-[68px] rounded-[8px] overflow-hidden border border-[var(--border)] flex-shrink-0">
              <ReleaseCover imageUrl={form.imageUrl} format={form.format} alt="Cover preview" />
            </span>

            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] font-semibold tracking-[-0.03em] leading-7 text-[var(--text-primary)] truncate">
                {form.artist || (isEdit ? 'Untitled release' : 'Add release')}
              </h1>
              <p className="text-[14px] text-[var(--text-secondary)] leading-tight truncate mt-0.5">
                {form.title || (isEdit ? '—' : 'New release for the catalogue')}
              </p>
              <div className="flex items-center gap-x-2.5 gap-y-1.5 flex-wrap mt-2.5">
                {metaBits.length > 0 && (
                  <span className="font-mono text-[11px] text-[var(--text-muted)]">
                    {metaBits.join(' · ')}
                  </span>
                )}
                {condLabel(form.condition) && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)]">
                    {condLabel(form.condition)}
                  </span>
                )}
                {isEdit && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${stockPill[1]}`}>
                    {stockPill[0]} · <span className="font-mono">{stock}</span>
                  </span>
                )}
                {flags.map(f => (
                  <span
                    key={f}
                    className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-muted)]"
                  >
                    {f}
                  </span>
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

          {isEdit && form.dealposVariantId && (
            <p className="text-[12px] text-[var(--text-muted)] mt-3">
              Synced from DealPOS · variant{' '}
              <span className="font-mono text-[11px]">{form.dealposVariantId}</span>
            </p>
          )}
        </div>

        {error && (
          <div className="text-[12px] text-[var(--danger)] border border-[var(--danger)] rounded-md px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-6">
          <Basics value={form} onChange={patch} />
          <FormatCondition value={form} onChange={patch} />
          <Pricing value={form} onChange={patch} />
          <StockLocation value={form} onChange={patch} />
          <Channels value={form} onChange={patch} />
          <Media value={form} onChange={patch} />
          <Description value={form} onChange={patch} aiBusy={aiBusy} runAi={runAi} />
          <Seo value={form} onChange={patch} aiBusy={aiBusy} runAi={runAi} />
          <Merchandising value={form} onChange={patch} />
        </div>
      </div>

      {/* sticky footer bar — floats over the form (Level 2) */}
      <div className="fixed bottom-0 left-[232px] right-0 max-md:left-0 z-30 bg-[var(--bg-surface)] border-t border-[var(--border)] shadow-[0_-4px_12px_rgba(0,0,0,0.28)]">
        <div className="mx-auto max-w-[940px] flex items-center gap-3 px-6 max-md:px-4 py-3">
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <span className={`w-1.5 h-1.5 rounded-full ${isEdit ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]'}`} />
            {isEdit ? 'Editing saved release' : 'New release'}
          </span>
          <span className="flex-1" />
          <Link
            to="/inventory"
            className="px-3.5 py-[9px] rounded-[6px] text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] text-[13px] font-semibold hover:opacity-[.88] disabled:opacity-50 transition-opacity"
          >
            {!loading && (
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            )}
            {loading ? 'Saving…' : 'Save release'}
          </button>
        </div>
      </div>
    </form>
  );
}

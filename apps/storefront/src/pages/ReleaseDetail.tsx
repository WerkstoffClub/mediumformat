import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getRelease } from '../api/storefront';
import type { Release, ReleaseTrack } from '../api/storefront';
import { formatIDR } from '../lib/idr';
import { Cover } from '../components/ReleaseCard';

const FORMAT_LABEL: Record<string, string> = {
  LP: 'LP',
  TWO_LP: '2×LP',
  THREE_LP: '3×LP',
  TWELVE_INCH: '12"',
  SEVEN_INCH: '7"',
  CD: 'CD',
  TWO_CD: '2×CD',
  CASSETTE: 'Cassette',
  MERCH: 'Merch',
};

const CONDITION_LABEL: Record<string, string> = {
  M: 'Mint',
  NM: 'Near Mint',
  VG_PLUS: 'Very Good+',
  VG: 'Very Good',
  G_PLUS: 'Good+',
  G: 'Good',
  F: 'Fair',
  P: 'Poor',
};

function formatDuration(sec?: number): string {
  if (!sec || Number.isNaN(sec)) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function firstPreview(track: ReleaseTrack): string | null {
  const p = track.previews?.[0]?.url;
  return typeof p === 'string' && p.length ? p : null;
}

export default function ReleaseDetail() {
  const { slug = '' } = useParams();
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRelease(null);
    getRelease(slug)
      .then((data) => {
        if (cancelled) return;
        if (!data) setError('Not found');
        else setRelease(data);
      })
      .catch((e: Error) => !cancelled && setError(e?.message ?? 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
      audioRef.current?.pause();
    };
  }, [slug]);

  const tracks = useMemo<ReleaseTrack[]>(
    () => (Array.isArray(release?.tracks) ? release!.tracks! : []),
    [release],
  );

  function togglePlay(i: number, url: string) {
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    if (playingIdx === i) {
      audio.pause();
      setPlayingIdx(null);
      return;
    }
    audio.src = url;
    audio.play().then(() => setPlayingIdx(i)).catch(() => setPlayingIdx(null));
    audio.onended = () => setPlayingIdx(null);
  }

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-16 text-[14px]" style={{ color: 'var(--mute)' }}>
        Loading release…
      </div>
    );
  }
  if (error === 'Not found') {
    return (
      <div className="max-w-[600px] mx-auto px-6 py-24 text-center">
        <h1 className="text-[24px] font-semibold mb-3" style={{ color: 'var(--ink)' }}>
          Release not found
        </h1>
        <p className="text-[14px] mb-6" style={{ color: 'var(--body)' }}>
          We couldn't find a record at that URL. It may have sold out or been removed.
        </p>
        <Link to="/catalog" className="btn-primary">← Back to catalog</Link>
      </div>
    );
  }
  if (error || !release) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="text-[13px] py-6 px-4 rcard" style={{ color: 'var(--danger)', background: 'var(--danger-t)' }}>
          Could not load release: {error ?? 'unknown error'}
        </div>
      </div>
    );
  }

  const formatLabel = FORMAT_LABEL[release.format] ?? release.format;
  const mediaCondition = CONDITION_LABEL[release.mediaGrade ?? release.condition] ?? release.condition;
  const sleeveCondition = release.sleeveGrade ? CONDITION_LABEL[release.sleeveGrade] : null;

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10">
      <nav className="text-[12px] mb-6" style={{ color: 'var(--mute)' }}>
        <Link to="/catalog" style={{ color: 'var(--body)' }}>Catalog</Link>
        <span className="mx-2">/</span>
        <span>{release.artist}</span>
      </nav>

      <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <div
            className="rcard aspect-square"
            style={{ overflow: 'hidden' }}
          >
            <Cover imageUrl={release.imageUrl} alt={`${release.artist} — ${release.title}`} />
          </div>
        </div>

        <div>
          <div
            className="text-[12px] font-medium uppercase tracking-wider mb-2"
            style={{ color: 'var(--mute)' }}
          >
            {release.label ?? 'Independent'}
            {release.year && <> · <span className="mono">{release.year}</span></>}
          </div>
          <h1
            className="text-[32px] md:text-[40px] font-semibold leading-[1.1] mb-2"
            style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}
          >
            {release.artist}
          </h1>
          <h2
            className="text-[20px] md:text-[24px] mb-6"
            style={{ color: 'var(--body)', letterSpacing: '-0.01em' }}
          >
            {release.title}
          </h2>

          <div className="mono text-[24px] font-semibold mb-6" style={{ color: 'var(--ink)' }}>
            {formatIDR(release.priceIdr)}
            {release.compareAtIdr && release.compareAtIdr > release.priceIdr && (
              <span className="ml-3 text-[14px] font-normal line-through" style={{ color: 'var(--mute)' }}>
                {formatIDR(release.compareAtIdr)}
              </span>
            )}
          </div>

          <dl
            className="grid grid-cols-2 gap-y-3 gap-x-6 rcard p-5 mb-6"
            style={{ background: 'var(--raised)' }}
          >
            <MetaRow label="Format" value={formatLabel} />
            <MetaRow label="Media" value={mediaCondition} />
            {sleeveCondition && <MetaRow label="Sleeve" value={sleeveCondition} />}
            {release.catNumber && <MetaRow label="Cat #" value={release.catNumber} mono />}
            {release.genre && <MetaRow label="Genre" value={release.genre} />}
            <MetaRow label="Stock" value={String(release.stock)} mono />
          </dl>

          <div className="flex gap-3 mb-6" title="Checkout coming soon">
            <button
              type="button"
              className="btn-primary flex-1"
              disabled
              aria-disabled
              title="Checkout coming soon"
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
            >
              Add to cart — checkout coming soon
            </button>
          </div>

          {release.notes && (
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--body)' }}>
              {release.notes}
            </p>
          )}
        </div>
      </div>

      {tracks.length > 0 && (
        <section className="mt-16">
          <div className="rcard">
            <div className="mf-panel-hdr" style={{ borderRadius: 'var(--r-lg) var(--r-lg) 0 0' }}>
              <span className="mf-panel-title">Tracklist</span>
              <span
                className="mono text-[11px]"
                style={{ color: 'var(--accent-text)', opacity: 0.75 }}
              >
                {tracks.length} tracks
              </span>
            </div>
            <ul>
              {tracks.map((t, i) => {
                const preview = firstPreview(t);
                const isPlaying = playingIdx === i;
                return (
                  <li
                    key={`${t.position ?? i}-${t.title}`}
                    className="flex items-center gap-4 px-5 py-3"
                    style={{ borderTop: i === 0 ? 'none' : '1px solid var(--hairline)' }}
                  >
                    <button
                      type="button"
                      className="track-play"
                      onClick={() => preview && togglePlay(i, preview)}
                      disabled={!preview}
                      aria-label={preview ? (isPlaying ? 'Pause' : 'Play preview') : 'No preview'}
                      title={preview ? (isPlaying ? 'Pause' : 'Play preview') : 'No preview available'}
                    >
                      {isPlaying ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <rect x="6" y="5" width="4" height="14" rx="1" />
                          <rect x="14" y="5" width="4" height="14" rx="1" />
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                    <div className="mono text-[12px] w-8" style={{ color: 'var(--mute)' }}>
                      {t.position ?? String(i + 1).padStart(2, '0')}
                    </div>
                    <div className="flex-1 text-[14px]" style={{ color: 'var(--ink)' }}>
                      {t.title}
                    </div>
                    <div className="mono text-[12px]" style={{ color: 'var(--mute)' }}>
                      {t.duration ?? formatDuration(t.durationSec)}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <style>{`
            .track-play {
              width: 28px; height: 28px;
              display: inline-flex; align-items: center; justify-content: center;
              border-radius: var(--r-pill);
              border: 1px solid var(--hairline);
              background: var(--surface);
              color: var(--ink);
              cursor: pointer; transition: background .15s, border-color .15s, opacity .15s;
              flex-shrink: 0;
            }
            .track-play:hover:not(:disabled) {
              background: var(--accent); color: var(--accent-text); border-color: var(--accent);
            }
            .track-play:disabled { opacity: .35; cursor: not-allowed; }
          `}</style>
        </section>
      )}
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt
        className="text-[12px] font-medium uppercase tracking-wider"
        style={{ color: 'var(--mute)' }}
      >
        {label}
      </dt>
      <dd
        className={`text-[13px] ${mono ? 'mono' : ''}`}
        style={{ color: 'var(--ink)' }}
      >
        {value}
      </dd>
    </>
  );
}

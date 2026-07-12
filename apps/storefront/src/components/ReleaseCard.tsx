import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Release } from '../api/storefront';
import { useCurrency } from '../hooks/useCurrency';

interface ReleaseCardProps {
  release: Release;
  compact?: boolean;
  /** Show the audio-available pill in the top-left of the cover. */
  hasPreview?: boolean;
}

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

const CONDITION_SHORT: Record<string, string> = {
  M: 'M',
  NM: 'NM',
  VG_PLUS: 'VG+',
  VG: 'VG',
  G_PLUS: 'G+',
  G: 'G',
  F: 'F',
  P: 'P',
};

/**
 * Product card per mockup-storefront `.rcard` recipe: square cover with
 * hover overlay + play button, wishlist toggle, optional audio-preview
 * pill, artist/title/label/chips block, and a price row with add-to-cart.
 */
export function ReleaseCard({ release, hasPreview = false }: ReleaseCardProps) {
  const to = release.slug ? `/releases/${encodeURIComponent(release.slug)}` : '#';
  const [wished, setWished] = useState(false);
  const { formatPrice } = useCurrency();

  const formatLabel = FORMAT_LABEL[release.format] ?? release.format;
  const conditionLabel = CONDITION_SHORT[release.condition] ?? release.condition;

  const labelBits: string[] = [];
  if (release.label) labelBits.push(release.label);
  if (release.catNumber) labelBits.push(release.catNumber);
  if (release.year !== null && release.year !== undefined) labelBits.push(String(release.year));

  return (
    <Link
      to={to}
      className="rcard"
      aria-label={`${release.artist} — ${release.title}`}
    >
      <div className="cover">
        <Cover imageUrl={release.imageUrl} alt={`${release.artist} — ${release.title}`} />
        <div className="cover-overlay">
          <span className="playbtn" aria-hidden>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </span>
        </div>
        <button
          type="button"
          className={wished ? 'wish-btn on' : 'wish-btn'}
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={wished}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setWished((v) => !v);
          }}
        >
          <svg viewBox="0 0 24 24" fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
        {hasPreview && (
          <div className="preview-dot" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <span>Audio</span>
          </div>
        )}
      </div>
      <div className="rinfo">
        <div className="rartist">{release.artist}</div>
        <div className="rtitle">{release.title}</div>
        {labelBits.length > 0 && (
          <div className="rlabel">{labelBits.join(' · ')}</div>
        )}
        <div className="chips">
          <span className="chip fmt">{formatLabel}</span>
          <span className="chip cond">{conditionLabel}</span>
          {release.genre && <span className="chip">{release.genre}</span>}
        </div>
        <div className="price-row-card">
          <span className="rprice">{formatPrice(release.priceIdr)}</span>
          <button
            type="button"
            className="add-btn"
            aria-label="Add to cart — checkout coming soon"
            title="Checkout coming soon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </button>
        </div>
      </div>
    </Link>
  );
}

interface CoverProps {
  imageUrl: string | null;
  alt: string;
  small?: boolean;
}

/**
 * Cover art per DESIGN.md — a monochrome vinyl-groove disc when there's no image.
 * Never colored.
 */
export function Cover({ imageUrl, alt, small }: CoverProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        loading="lazy"
        className="w-full h-full object-cover"
        style={{ background: 'var(--surface)' }}
      />
    );
  }
  return (
    <div className={`cover-art${small ? ' sm' : ''}`}>
      <div className="grooves" aria-hidden />
    </div>
  );
}

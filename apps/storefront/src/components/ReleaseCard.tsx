import { Link } from 'react-router-dom';
import type { Release } from '../api/storefront';
import { formatIDR } from '../lib/idr';

interface ReleaseCardProps {
  release: Release;
  compact?: boolean;
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

export function ReleaseCard({ release, compact = false }: ReleaseCardProps) {
  const to = release.slug ? `/releases/${encodeURIComponent(release.slug)}` : '#';
  return (
    <Link to={to} className="rcard block group" aria-label={`${release.artist} — ${release.title}`}>
      <div className="aspect-square">
        <Cover imageUrl={release.imageUrl} alt={`${release.artist} — ${release.title}`} small={compact} />
      </div>
      <div className="p-3 space-y-1">
        <div className="text-[13px] font-medium truncate" style={{ color: 'var(--ink)' }}>
          {release.artist}
        </div>
        <div className="text-[13px] truncate" style={{ color: 'var(--mute)' }}>
          {release.title}
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="chip mono">{FORMAT_LABEL[release.format] ?? release.format}</span>
          <span className="mono text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
            {formatIDR(release.priceIdr)}
          </span>
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

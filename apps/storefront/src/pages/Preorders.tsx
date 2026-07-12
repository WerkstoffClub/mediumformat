import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPreorders } from '../api/storefront';
import type { Release } from '../api/storefront';
import { formatIDR } from '../lib/idr';
import { Cover } from '../components/ReleaseCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

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

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const eta = Date.parse(iso);
  if (Number.isNaN(eta)) return null;
  const now = Date.now();
  const days = Math.ceil((eta - now) / 86_400_000);
  return days;
}

function formatEta(iso: string | null | undefined): string {
  if (!iso) return 'TBA';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'TBA';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Preorders() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPreorders()
      .then((data) => !cancelled && setReleases(data))
      .catch((e: Error) => !cancelled && setError(e?.message ?? 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10">
      <header className="mb-8">
        <div
          className="text-[12px] font-medium uppercase tracking-wider mb-1"
          style={{ color: 'var(--mute)' }}
        >
          Coming soon
        </div>
        <h1
          className="text-[28px] md:text-[32px] font-semibold"
          style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}
        >
          Preorders
        </h1>
        <p className="text-[14px] mt-2 max-w-2xl" style={{ color: 'var(--body)' }}>
          Reserve records before they arrive in Jakarta. Preorders ship as soon as stock lands.
        </p>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <LoadingSkeleton count={8} height={320} />
        </div>
      ) : error ? (
        <div
          className="text-[13px] py-6 px-4 rcard"
          style={{ color: 'var(--danger)', background: 'var(--danger-t)' }}
        >
          Could not load preorders: {error}
        </div>
      ) : releases.length === 0 ? (
        <div className="text-center text-[13px] py-16 rcard" style={{ color: 'var(--mute)' }}>
          No preorders open at the moment.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {releases.map((r) => (
            <PreorderCard key={r.id} release={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function PreorderCard({ release }: { release: Release }) {
  const days = daysUntil(release.preorderEta);
  const to = release.slug ? `/releases/${encodeURIComponent(release.slug)}` : '#';
  return (
    <Link to={to} className="rcard block">
      <div className="aspect-square relative">
        <Cover imageUrl={release.imageUrl} alt={`${release.artist} — ${release.title}`} />
        <span
          className="chip mono absolute top-3 left-3"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--hairline)',
            color: 'var(--ink)',
          }}
        >
          {days !== null && days > 0 ? `${days}d to go` : days !== null && days <= 0 ? 'Arriving' : 'TBA'}
        </span>
      </div>
      <div className="p-3 space-y-1">
        <div className="text-[13px] font-medium truncate" style={{ color: 'var(--ink)' }}>
          {release.artist}
        </div>
        <div className="text-[13px] truncate" style={{ color: 'var(--mute)' }}>
          {release.title}
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="mono text-[11px]" style={{ color: 'var(--mute)' }}>
            ETA {formatEta(release.preorderEta)}
          </span>
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

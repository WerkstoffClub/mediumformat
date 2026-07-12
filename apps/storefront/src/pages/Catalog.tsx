import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listReleases } from '../api/storefront';
import type { Release, RecordFormat } from '../api/storefront';
import { ReleaseCard } from '../components/ReleaseCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

const FORMATS: Array<{ value: '' | RecordFormat; label: string }> = [
  { value: '', label: 'All formats' },
  { value: 'LP', label: 'LP' },
  { value: 'TWO_LP', label: '2×LP' },
  { value: 'THREE_LP', label: '3×LP' },
  { value: 'TWELVE_INCH', label: '12"' },
  { value: 'SEVEN_INCH', label: '7"' },
  { value: 'CD', label: 'CD' },
  { value: 'TWO_CD', label: '2×CD' },
  { value: 'CASSETTE', label: 'Cassette' },
  { value: 'MERCH', label: 'Merch' },
];

const PAGE_SIZE = 24;

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const format = (params.get('format') ?? '') as '' | RecordFormat;
  const q = params.get('q') ?? '';
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);

  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // local input state for search — debounce commit into URL
  const [qInput, setQInput] = useState(q);

  useEffect(() => {
    setQInput(q);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listReleases({ page, limit: PAGE_SIZE, format: format || undefined, q: q || undefined })
      .then((data) => {
        if (cancelled) return;
        setReleases(data);
      })
      .catch((e: Error) => !cancelled && setError(e?.message ?? 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, format, q]);

  const setUrl = (next: URLSearchParams) => setParams(next, { replace: true });

  function onFormatChange(next: string) {
    const p = new URLSearchParams(params);
    if (next) p.set('format', next);
    else p.delete('format');
    p.delete('page');
    setUrl(p);
  }

  function commitSearch(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams(params);
    if (qInput.trim()) p.set('q', qInput.trim());
    else p.delete('q');
    p.delete('page');
    setUrl(p);
  }

  function gotoPage(n: number) {
    const p = new URLSearchParams(params);
    if (n <= 1) p.delete('page');
    else p.set('page', String(n));
    setUrl(p);
  }

  const hasNext = releases.length === PAGE_SIZE;
  const hasPrev = page > 1;

  const activeFormatLabel = useMemo(
    () => FORMATS.find((f) => f.value === format)?.label ?? 'All formats',
    [format],
  );

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10">
      <header className="mb-8">
        <div
          className="text-[12px] font-medium uppercase tracking-wider mb-1"
          style={{ color: 'var(--mute)' }}
        >
          Catalog
        </div>
        <h1
          className="text-[28px] md:text-[32px] font-semibold"
          style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}
        >
          Every record in the shop
        </h1>
      </header>

      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <aside>
          <div
            className="rcard"
            style={{ overflow: 'visible' }}
          >
            <div className="mf-panel-hdr" style={{ borderRadius: 'var(--r-lg) var(--r-lg) 0 0' }}>
              <span className="mf-panel-title">Filters</span>
            </div>
            <div className="p-4 space-y-5">
              <div>
                <label
                  className="block text-[12px] font-medium uppercase tracking-wider mb-2"
                  style={{ color: 'var(--mute)' }}
                >
                  Format
                </label>
                <select
                  className="fld"
                  value={format}
                  onChange={(e) => onFormatChange(e.target.value)}
                  aria-label="Format"
                >
                  {FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <form onSubmit={commitSearch}>
                <label
                  className="block text-[12px] font-medium uppercase tracking-wider mb-2"
                  style={{ color: 'var(--mute)' }}
                >
                  Search
                </label>
                <input
                  type="search"
                  className="fld"
                  placeholder="Artist, title, catalog #"
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                />
                <button type="submit" className="btn-secondary mt-3 w-full">
                  Apply
                </button>
              </form>
            </div>
          </div>
        </aside>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-[13px]" style={{ color: 'var(--body)' }}>
              {loading
                ? 'Loading…'
                : `${releases.length} result${releases.length === 1 ? '' : 's'}`}
              <span className="mx-2" style={{ color: 'var(--hairline)' }}>·</span>
              <span style={{ color: 'var(--mute)' }}>
                {activeFormatLabel}
                {q && ` · "${q}"`}
              </span>
            </div>
            <div className="text-[12px] mono" style={{ color: 'var(--mute)' }}>
              Page {page}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <LoadingSkeleton count={8} height={280} />
            </div>
          ) : error ? (
            <div
              className="text-[13px] py-6 px-4 rcard"
              style={{ color: 'var(--danger)', background: 'var(--danger-t)' }}
            >
              Could not load catalog: {error}
            </div>
          ) : releases.length === 0 ? (
            <div
              className="text-center text-[13px] py-16 rcard"
              style={{ color: 'var(--mute)' }}
            >
              No records match those filters.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {releases.map((r) => (
                <ReleaseCard key={r.id} release={r} />
              ))}
            </div>
          )}

          {(hasPrev || hasNext) && (
            <div className="flex justify-between items-center mt-8">
              <button
                type="button"
                className="btn-secondary"
                disabled={!hasPrev}
                onClick={() => gotoPage(page - 1)}
              >
                ← Previous
              </button>
              <div className="text-[13px] mono" style={{ color: 'var(--mute)' }}>
                Page {page}
              </div>
              <button
                type="button"
                className="btn-secondary"
                disabled={!hasNext}
                onClick={() => gotoPage(page + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

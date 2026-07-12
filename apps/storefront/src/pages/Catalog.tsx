import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listReleases } from '../api/storefront';
import type { Release, RecordFormat } from '../api/storefront';
import { ReleaseCard } from '../components/ReleaseCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

interface FormatOption {
  value: RecordFormat;
  label: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  { value: 'LP', label: 'Vinyl LP' },
  { value: 'SEVEN_INCH', label: 'Vinyl 7" / Single' },
  { value: 'TWELVE_INCH', label: 'Vinyl 12"' },
  { value: 'CD', label: 'CD' },
  { value: 'CASSETTE', label: 'Cassette' },
  { value: 'MERCH', label: 'Merch & Accessories' },
];

const CONDITIONS = ['M', 'VG+', 'VG', 'G+', 'G'] as const;
type ConditionChip = (typeof CONDITIONS)[number];

const SORT_OPTIONS = [
  { value: 'new', label: 'New arrivals' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'artist', label: 'Artist A–Z' },
  { value: 'label', label: 'Label A–Z' },
];

const PAGE_SIZE = 24;

function paramList(v: string | null): string[] {
  return v ? v.split(',').filter(Boolean) : [];
}

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const singleFormat = (params.get('format') ?? '') as RecordFormat | '';
  const formats: string[] = singleFormat ? [singleFormat] : paramList(params.get('formats'));
  const conditions = paramList(params.get('cond'));
  const q = params.get('q') ?? '';
  const sort = params.get('sort') ?? 'new';
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);

  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // API only supports a single `format` param today. If multiple selected,
  // fall back to no filter and note the count post-filter locally.
  const apiFormat: RecordFormat | undefined =
    formats.length === 1 ? (formats[0] as RecordFormat) : undefined;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listReleases({
      page,
      limit: PAGE_SIZE,
      format: apiFormat,
      q: q || undefined,
    })
      .then((data) => {
        if (cancelled) return;
        setReleases(data);
      })
      .catch(
        (e: Error) => !cancelled && setError(e?.message ?? 'Failed to load'),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, apiFormat, q]);

  const setUrl = (next: URLSearchParams) => setParams(next, { replace: true });

  function updateParams(mutator: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(params);
    mutator(next);
    next.delete('page');
    setUrl(next);
  }

  function toggleFormat(value: RecordFormat) {
    updateParams((p) => {
      const current = new Set(formats);
      if (current.has(value)) current.delete(value);
      else current.add(value);
      p.delete('format');
      if (current.size > 0) p.set('formats', Array.from(current).join(','));
      else p.delete('formats');
    });
  }

  function toggleCondition(value: ConditionChip) {
    updateParams((p) => {
      const current = new Set(conditions);
      if (current.has(value)) current.delete(value);
      else current.add(value);
      if (current.size > 0) p.set('cond', Array.from(current).join(','));
      else p.delete('cond');
    });
  }

  function changeSort(value: string) {
    updateParams((p) => {
      if (value && value !== 'new') p.set('sort', value);
      else p.delete('sort');
    });
  }

  function gotoPage(n: number) {
    const p = new URLSearchParams(params);
    if (n <= 1) p.delete('page');
    else p.set('page', String(n));
    setUrl(p);
  }

  // Client-side filtering for condition + multi-format when the API can't
  // yet enforce them. Keeps the UI honest even against the loose backend.
  const visibleReleases = useMemo(() => {
    const conditionSet = new Set(conditions);
    return releases.filter((r) => {
      if (formats.length > 1 && !formats.includes(r.format)) return false;
      if (conditionSet.size > 0) {
        const cond = r.condition.replace('_PLUS', '+');
        if (!conditionSet.has(cond)) return false;
      }
      return true;
    });
  }, [releases, formats, conditions]);

  const totalLabel = loading ? '—' : String(visibleReleases.length);
  const hasNext = releases.length === PAGE_SIZE;
  const hasPrev = page > 1;

  const filtersPanel = (
    <>
      <div className="fsec">
        <div className="flabel">Sort by</div>
        <select
          className="fselect"
          value={sort}
          onChange={(e) => changeSort(e.target.value)}
          aria-label="Sort by"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="fsec">
        <div className="flabel">
          Format
          {formats.length > 0 && (
            <span className="flabel-count mono">{formats.length}</span>
          )}
        </div>
        {FORMAT_OPTIONS.map((opt) => {
          const on = formats.includes(opt.value);
          return (
            <label key={opt.value} className="fopt">
              <span
                className={on ? 'fcheck on' : 'fcheck'}
                onClick={(e) => {
                  e.preventDefault();
                  toggleFormat(opt.value);
                }}
                role="checkbox"
                aria-checked={on}
                tabIndex={0}
              >
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="2,6 5,9 10,3" />
                </svg>
              </span>
              <span className="fopt-label">{opt.label}</span>
            </label>
          );
        })}
      </div>
      <div className="fsec">
        <div className="flabel">Condition</div>
        <div className="cond-chips">
          {CONDITIONS.map((c) => {
            const on = conditions.includes(c);
            return (
              <button
                key={c}
                type="button"
                className={on ? 'cchip on' : 'cchip'}
                onClick={() => toggleCondition(c)}
                aria-pressed={on}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>
      <div className="fsec">
        <div className="flabel">Search</div>
        <SearchField
          initial={q}
          onCommit={(next) =>
            updateParams((p) => {
              if (next) p.set('q', next);
              else p.delete('q');
            })
          }
        />
      </div>
      <div className="fsec">
        <div className="flabel">Price range</div>
        <div className="price-row">
          <span>Rp 0</span>
          <strong>Rp 2.000.000</strong>
        </div>
        <input
          type="range"
          className="pslider"
          min={0}
          max={2000000}
          defaultValue={2000000}
          aria-label="Maximum price"
          disabled
        />
      </div>
      <div className="fsec">
        <div className="flabel">Audio preview</div>
        <div className="toggle-row">
          <span>Has preview only</span>
          <button
            type="button"
            className="tswitch off"
            aria-checked={false}
            aria-label="Filter by audio preview"
            role="switch"
            disabled
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="layout">
      <aside className="sidebar" aria-label="Filters">
        {filtersPanel}
      </aside>

      <div className="content">
        <div className="content-bar">
          <div className="cb-left">
            <button
              type="button"
              className="filter-trigger"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open filters"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="7" y1="12" x2="17" y2="12" />
                <line x1="10" y1="18" x2="14" y2="18" />
              </svg>
              Filters
            </button>
            <div className="result-count">
              <strong>{totalLabel}</strong> releases
            </div>
          </div>
          <div className="view-btns" role="group" aria-label="View">
            <button
              type="button"
              className={view === 'grid' ? 'vbtn on' : 'vbtn'}
              onClick={() => setView('grid')}
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              className={view === 'list' ? 'vbtn on' : 'vbtn'}
              onClick={() => setView('list')}
              aria-label="List view"
              aria-pressed={view === 'list'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <circle cx="3" cy="6" r="1" fill="currentColor" />
                <circle cx="3" cy="12" r="1" fill="currentColor" />
                <circle cx="3" cy="18" r="1" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid-releases">
            <LoadingSkeleton count={8} height={340} />
          </div>
        ) : error ? (
          <div style={{ padding: 20 }}>
            <div
              className="text-[13px] py-6 px-4 rcard"
              style={{ color: 'var(--danger)', background: 'var(--danger-t)' }}
            >
              Could not load catalog: {error}
            </div>
          </div>
        ) : visibleReleases.length === 0 ? (
          <div style={{ padding: 20 }}>
            <div
              className="text-center text-[13px] py-16 rcard"
              style={{ color: 'var(--mute)', cursor: 'default' }}
            >
              No records match those filters.
            </div>
          </div>
        ) : (
          <div className="grid-releases">
            {visibleReleases.map((r) => (
              <ReleaseCard key={r.id} release={r} />
            ))}
          </div>
        )}

        {(hasPrev || hasNext) && (
          <nav className="pagination" aria-label="Pagination">
            <button
              className="ppage"
              onClick={() => gotoPage(page - 1)}
              disabled={!hasPrev}
              aria-label="Previous page"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button className="ppage on" aria-current="page">
              {page}
            </button>
            {hasNext && (
              <button className="ppage" onClick={() => gotoPage(page + 1)} aria-label={`Go to page ${page + 1}`}>
                {page + 1}
              </button>
            )}
            {hasNext && (
              <button
                className="ppage"
                onClick={() => gotoPage(page + 1)}
                aria-label="Next page"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            )}
          </nav>
        )}
      </div>

      {/* Mobile filter drawer */}
      <div
        className={drawerOpen ? 'scrim open' : 'scrim'}
        onClick={() => setDrawerOpen(false)}
        aria-hidden
      />
      <aside
        className={drawerOpen ? 'drawer open' : 'drawer'}
        aria-label="Filters"
        aria-hidden={!drawerOpen}
      >
        <div className="drawer-hdr">
          <h3>Filters</h3>
          <button
            type="button"
            className="drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close filters"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {drawerOpen && filtersPanel}
      </aside>
    </div>
  );
}

function SearchField({
  initial,
  onCommit,
}: {
  initial: string;
  onCommit: (v: string) => void;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    setValue(initial);
  }, [initial]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onCommit(value.trim());
      }}
    >
      <input
        type="search"
        className="fld"
        placeholder="Artist, title, catalog #"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </form>
  );
}

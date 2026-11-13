import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getReleases, deleteRelease, type ReleaseFilter } from '../../api/inventory';
import { getCatalogSummary } from '../../api/ops';
import { Paginator } from '../../components/ui/Page';
import { ReleaseCover } from '../../components/ui/Cover';
import type { Release } from '@mf/shared';
import { BarcodeLabelModal } from './BarcodeLabel';

const USD_RATE = 16_300; // display-only approximation, like the prototype's "≈ $"
const LOW_AT = 2;

const FORMATS = ['LP', 'TWO_LP', 'THREE_LP', 'TWELVE_INCH', 'SEVEN_INCH', 'CD', 'TWO_CD', 'CASSETTE', 'MERCH'];
const CONDITIONS = ['M', 'VGP', 'VG', 'GP', 'G', 'F', 'P'];
const STOCK_STATES = [['', 'All'], ['in', 'In stock'], ['low', 'Low'], ['out', 'Out']] as const;
const SORTS = [['newest', 'Newest'], ['price_asc', 'Price: low → high'], ['price_desc', 'Price: high → low'], ['artist', 'Artist A–Z'], ['stock_asc', 'Stock: low first']] as const;

const fmtLabel = (f: string) => f.replace('TWO_', '2x').replace('THREE_', '3x').replace('TWELVE_INCH', '12"').replace('SEVEN_INCH', '7"');
const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

function StockPill({ release }: { release: Release }) {
  const state = release.stock === 0 ? 'out' : release.stock <= LOW_AT ? 'low' : 'in';
  const map = {
    in:  ['In stock', 'text-[var(--success)] bg-[var(--success-t)]'],
    low: ['Low', 'text-[var(--warning)] bg-[var(--warning-t)]'],
    out: ['Out', 'text-[var(--danger)] bg-[var(--danger-t)]'],
  } as const;
  const [label, cls] = map[state];
  return (
    <span className={`inline-flex items-center gap-[5px] text-[11px] font-medium px-[9px] py-0.5 rounded-full whitespace-nowrap ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
      {label}
    </span>
  );
}

function Chip({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`text-[13px] font-medium px-3 py-1 min-h-[28px] rounded-full border transition-colors ${
        on ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
      }`}
    >
      {children}
    </button>
  );
}

export function InventoryList({ onLoad }: { onLoad?: (rows: Release[], total: number) => void } = {}) {
  const navigate = useNavigate();
  const [releases, setReleases] = useState<Release[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') ?? '';
  const [format, setFormat] = useState('');
  const [condition, setCondition] = useState('');
  const [stock, setStock] = useState('');
  const [genre, setGenre] = useState('');
  const [sort, setSort] = useState('newest');
  const [genres, setGenres] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [labelFor, setLabelFor] = useState<Release | null>(null);
  const filterWrap = useRef<HTMLDivElement>(null);

  // Close the Filters popover on any click outside it.
  useEffect(() => {
    if (!filtersOpen) return;
    const close = (e: MouseEvent) => { if (!filterWrap.current?.contains(e.target as Node)) setFiltersOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [filtersOpen]);

  useEffect(() => {
    getCatalogSummary().then(c => setGenres(c.genres.map(g => g.name).filter(g => g !== 'Uncategorised').slice(0, 24))).catch(() => {});
  }, []);

  const filter: ReleaseFilter = useMemo(() => ({
    page, limit: 50,
    q: search || undefined,
    format: format || undefined,
    condition: condition || undefined,
    stock: (stock || undefined) as ReleaseFilter['stock'],
    genre: genre || undefined,
    sort: sort as ReleaseFilter['sort'],
  }), [page, search, format, condition, stock, genre, sort]);

  useEffect(() => {
    setLoading(true);
    getReleases(filter)
      .then(r => { setReleases(r.data); setTotal(r.total); onLoad?.(r.data, r.total); })
      .finally(() => setLoading(false));
  }, [filter, onLoad]);

  const activeFilters = [format, condition, stock, genre].filter(Boolean).length;

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this release?')) return;
    await deleteRelease(id);
    getReleases(filter).then(r => { setReleases(r.data); setTotal(r.total); onLoad?.(r.data, r.total); });
  };


  const clearFilters = () => { setFormat(''); setCondition(''); setStock(''); setGenre(''); setPage(1); };

  const th = 'text-left px-3.5 pt-3 pb-2.5 text-[11px] uppercase tracking-[0.04em] text-[var(--text-muted)] font-semibold whitespace-nowrap';
  const td = 'px-3.5 py-[11px] border-t border-[var(--border)] text-[13px] text-[var(--text-secondary)] align-middle';
  const btnSec = 'inline-flex items-center gap-1.5 px-[13px] py-2 rounded-[6px] border text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors';

  return (
    <div>
      {/* toolbar — mockup pattern: search · Filters popover · Sort */}
      <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
        <div className="flex items-center gap-[9px] bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[6px] px-3 py-[9px] flex-1 min-w-[220px] max-w-[340px] focus-within:border-[var(--text-muted)] transition-colors">
          <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] text-[var(--text-muted)] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            aria-label="Search releases"
            className="bg-transparent text-[13px] outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] w-full"
            placeholder="Search artist, title, label, cat# or barcode…"
            value={search}
            onChange={e => { const v = e.target.value; setSearchParams(v ? { q: v } : {}, { replace: true }); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2.5 ml-auto flex-wrap">
          <div ref={filterWrap} className="relative">
            <button
              type="button"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen(o => !o)}
              className={`${btnSec} ${filtersOpen ? 'border-[var(--accent)]' : 'border-[var(--border)]'}`}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/></svg>
              Filters
              {activeFilters > 0 && <span className="font-mono text-[10px] bg-[var(--accent)] text-[var(--accent-text)] rounded-full px-1.5 ml-0.5">{activeFilters}</span>}
            </button>
            {filtersOpen && (
              <div className="absolute top-[calc(100%+6px)] right-0 z-30 w-[340px] max-w-[calc(100vw-32px)] max-h-[70vh] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] shadow-[0_4px_12px_rgba(0,0,0,.6)] p-3.5">
                {[
                  ['Format', FORMATS.map(f => [f, fmtLabel(f)]), format, setFormat],
                  ['Condition', CONDITIONS.map(c => [c, c === 'VGP' ? 'VG+' : c === 'GP' ? 'G+' : c]), condition, setCondition],
                  ['Stock', STOCK_STATES.slice(1), stock, setStock],
                  ['Genre', genres.map(g => [g, g]), genre, setGenre],
                ].map(([label, opts, value, setter]) => (
                  <div key={label as string} className="mb-[13px]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)] mb-2">{label as string}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      <Chip on={!value} onClick={() => { (setter as (v: string) => void)(''); setPage(1); }}>All</Chip>
                      {(opts as string[][]).map(([v, l]) => (
                        <Chip key={v} on={value === v} onClick={() => { (setter as (v: string) => void)(value === v ? '' : v); setPage(1); }}>{l}</Chip>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center border-t border-[var(--border)] pt-3 mt-0.5">
                  <button type="button" onClick={clearFilters} className="text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">Clear all</button>
                  <button type="button" onClick={() => setFiltersOpen(false)} className="bg-[var(--accent)] text-[var(--accent-text)] rounded-[6px] px-[15px] py-[7px] text-[13px] font-medium">Done</button>
                </div>
              </div>
            )}
          </div>
          <label className="flex items-center gap-[7px] bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[6px] pl-3 pr-2">
            <span className="text-[12px] text-[var(--text-muted)]">Sort</span>
            <select
              value={sort}
              onChange={e => { setSort(e.target.value); setPage(1); }}
              className="bg-transparent outline-none text-[13px] text-[var(--text-primary)] py-[9px] px-1 cursor-pointer"
            >
              {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[8px] overflow-x-auto">
        <table className="w-full border-collapse min-w-[900px]">
          <thead>
            <tr>
              <th className={th}>Release</th>
              <th className={th}>Cat#</th>
              <th className={th}>Format</th>
              <th className={th}>Condition</th>
              <th className={`${th} text-right`}>Stock</th>
              <th className={`${th} text-right`}>Price</th>
              <th className={th}>Location</th>
              <th className={th}><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className={`${td} py-8 text-center text-[var(--text-muted)]`}>Loading…</td></tr>}
            {!loading && releases.length === 0 && <tr><td colSpan={8} className={`${td} py-8 text-center text-[var(--text-muted)]`}>No releases match.</td></tr>}
            {releases.map(r => (
              <tr
                key={r.id}
                onClick={e => {
                  // Row opens the editor; inner links/buttons handle their own clicks.
                  if ((e.target as HTMLElement).closest('a,button')) return;
                  navigate(`/inventory/${r.id}/edit`);
                }}
                className="group cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
              >
                <td className={td}>
                  <div className="flex items-center gap-[11px] min-w-0">
                    <span className="w-[38px] h-[38px] rounded-[4px] flex-shrink-0 overflow-hidden border border-[var(--border)]">
                      <ReleaseCover imageUrl={r.imageUrl} format={r.format} />
                    </span>
                    <span className="min-w-0 flex flex-col">
                      <Link
                        to={`/inventory/${r.id}/edit`}
                        className="text-[13px] font-semibold text-[var(--text-primary)] truncate max-w-[280px] rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                      >
                        {r.artist}
                      </Link>
                      <span className="text-[12px] text-[var(--text-muted)] truncate max-w-[280px]">{r.title}{r.genre ? ` · ${r.genre}` : ''}</span>
                    </span>
                  </div>
                </td>
                <td className={`${td} text-[12px] text-[var(--text-muted)] whitespace-nowrap`}>{r.catNumber ?? '—'}</td>
                <td className={`${td} text-[12px]`}>{fmtLabel(r.format)}</td>
                <td className={td}>
                  <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)]">
                    {r.condition === 'VGP' ? 'VG+' : r.condition === 'GP' ? 'G+' : r.condition}
                  </span>
                </td>
                <td className={`${td} text-right`}>
                  <span className="inline-flex items-center gap-2 justify-end">
                    <span className="font-mono font-medium text-[var(--text-primary)]">{r.stock}</span>
                    <StockPill release={r} />
                  </span>
                </td>
                <td className={`${td} text-right whitespace-nowrap`}>
                  <span className="block font-mono font-medium text-[var(--text-primary)]">{idr.format(r.priceIdr)}</span>
                  <span className="block font-mono text-[10px] text-[var(--text-muted)]">≈ ${Math.round(r.priceIdr / USD_RATE)}</span>
                </td>
                <td className={`${td} text-[12px] text-[var(--text-muted)] whitespace-nowrap`}>
                  {r.storeLocation.replace('_', ' ')}{r.shelfLocation ? ` · ${r.shelfLocation}` : ''}
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setLabelFor(r); }}
                      title="Print barcode label"
                      aria-label="Print barcode label"
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><path d="M3 5v14M7 5v14M11 5v14M14 5v14M18 5v14M21 5v14"/></svg>
                    </button>
                    <Link to={`/inventory/${r.id}/edit`} className="text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]">Edit</Link>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleDelete(r.id); }}
                      className="text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--danger)]"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginator page={page} limit={50} total={total} shown={releases.length} onPage={setPage} />
      </div>
      {labelFor && <BarcodeLabelModal release={labelFor} onClose={() => setLabelFor(null)} />}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getReleases, deleteRelease, type ReleaseFilter } from '../../api/inventory';
import { getCatalogSummary } from '../../api/ops';
import { PageHeader, Paginator, SearchBox } from '../../components/ui/Page';
import type { Release } from '@mf/shared';

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
  return <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>{label}</span>;
}

/** Prototype's barcode-label print: black-on-white label in a print window. */
function printBarcode(release: Release) {
  const code = release.barcode ?? release.catNumber ?? release.id;
  const win = window.open('', 'mf-label', 'width=420,height=320');
  if (!win) return;
  win.document.write(`<!doctype html><title>Label — ${code}</title>
  <style>
    body{font-family:"Geist","Helvetica Neue",Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
    .label{background:#fff;color:#000;border:1px solid #e4e4e4;border-radius:6px;padding:16px 20px;text-align:center;width:280px}
    .a{font-size:13px;font-weight:600}.t{font-size:11px;color:#525252;margin-top:2px}
    .bars{margin:12px auto 4px;height:44px;display:flex;align-items:stretch;justify-content:center;gap:0}
    .bars i{display:block;background:#000}
    .code{font-family:"Geist Mono",monospace;font-size:11px;letter-spacing:.12em}
    .price{font-family:"Geist Mono",monospace;font-size:13px;font-weight:500;margin-top:6px}
    @media print{body{height:auto}.label{border:none}}
  </style>
  <div class="label">
    <div class="a">${release.artist}</div>
    <div class="t">${release.title}</div>
    <div class="bars">${code.split('').map((ch, i) => `<i style="width:${(ch.charCodeAt(0) % 3) + 1}px;margin-right:${(i % 2) + 1}px"></i>`).join('')}</div>
    <div class="code">${code}</div>
    <div class="price">${idr.format(release.priceIdr)}</div>
  </div>
  <script>setTimeout(()=>window.print(),150)</script>`);
  win.document.close();
}

function Chip({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] px-3 py-1 rounded-full border transition-colors ${
        on ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
      }`}
    >
      {children}
    </button>
  );
}

export function InventoryList() {
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
      .then(r => { setReleases(r.data); setTotal(r.total); })
      .finally(() => setLoading(false));
  }, [filter]);

  const activeFilters = [format, condition, stock, genre].filter(Boolean).length;

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this release?')) return;
    await deleteRelease(id);
    getReleases(filter).then(r => { setReleases(r.data); setTotal(r.total); });
  };

  const th = 'text-left px-3.5 py-2 text-[9px] uppercase tracking-[0.07em] text-[var(--text-faint)] font-semibold border-b border-[var(--border-sub)] whitespace-nowrap';
  const td = 'px-3.5 py-2.5 text-[11.5px]';

  return (
    <div>
      <PageHeader
        title="Inventory"
        sub={`${total} releases · synced from DealPOS`}
        actions={
          <Link to="/categories" className="text-[11px] px-3 py-1.5 rounded-[6px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors">
            Locations & categories
          </Link>
        }
      />

      {/* toolbar — mockup pattern: search · Filters panel · Sort */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SearchBox value={search} onChange={v => { setSearchParams(v ? { q: v } : {}, { replace: true }); setPage(1); }} placeholder="Search artist, title, label, cat# or barcode…" />
        <button
          onClick={() => setFiltersOpen(o => !o)}
          className={`text-[11px] px-3 py-1.5 rounded-md border transition-colors flex items-center gap-1.5 ${
            filtersOpen || activeFilters > 0 ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-[var(--border)] text-[var(--text-secondary)]'
          }`}
        >
          Filters
          {activeFilters > 0 && <span className="font-mono text-[10px] bg-[var(--bg-overlay)] border border-[var(--border)] rounded-full px-1.5">{activeFilters}</span>}
        </button>
        <div className="flex-1" />
        <label className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
          Sort
          <select
            value={sort}
            onChange={e => { setSort(e.target.value); setPage(1); }}
            className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-2 py-1.5 text-[11px] text-[var(--text-primary)]"
          >
            {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      {filtersOpen && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4 mb-3 space-y-3">
          {[
            ['Format', FORMATS.map(f => [f, fmtLabel(f)]), format, setFormat],
            ['Condition', CONDITIONS.map(c => [c, c === 'VGP' ? 'VG+' : c === 'GP' ? 'G+' : c]), condition, setCondition],
            ['Stock', STOCK_STATES.slice(1), stock, setStock],
            ['Genre', genres.map(g => [g, g]), genre, setGenre],
          ].map(([label, opts, value, setter]) => (
            <div key={label as string} className="flex items-start gap-3 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)] w-[72px] pt-1.5">{label as string}</span>
              <div className="flex gap-1.5 flex-wrap flex-1">
                <Chip on={!value} onClick={() => { (setter as (v: string) => void)(''); setPage(1); }}>All</Chip>
                {(opts as string[][]).map(([v, l]) => (
                  <Chip key={v} on={value === v} onClick={() => { (setter as (v: string) => void)(value === v ? '' : v); setPage(1); }}>{l}</Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-x-auto">
        <table className="w-full border-collapse min-w-[860px]">
          <thead>
            <tr className="bg-[var(--bg-overlay)]">
              <th className={th}>Release</th>
              <th className={th}>Cat# / SKU</th>
              <th className={th}>Format</th>
              <th className={th}>Condition</th>
              <th className={`${th} text-right`}>Stock</th>
              <th className={`${th} text-right`}>Price</th>
              <th className={th}>Location</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-3.5 py-8 text-center text-[11px] text-[var(--text-faint)]">Loading…</td></tr>}
            {!loading && releases.length === 0 && <tr><td colSpan={8} className="px-3.5 py-8 text-center text-[11px] text-[var(--text-faint)]">No releases match.</td></tr>}
            {releases.map(r => (
              <tr key={r.id} className="group border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)]">
                <td className={td}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-9 h-9 rounded-[6px] flex-shrink-0 overflow-hidden bg-[var(--bg-overlay)] border border-[var(--border-sub)] flex items-center justify-center">
                      {r.imageUrl
                        ? <img src={r.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                        : <span className="w-6 h-6 rounded-full" style={{ background: 'repeating-radial-gradient(circle at 50% 50%, var(--text-faint) 0 1px, transparent 1px 3px)' }} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium text-[var(--text-primary)] truncate max-w-[240px]">{r.artist}</span>
                      <span className="block text-[10.5px] text-[var(--text-muted)] truncate max-w-[240px]">{r.title}{r.genre ? ` · ${r.genre}` : ''}</span>
                    </span>
                  </div>
                </td>
                <td className={`${td} font-mono text-[10.5px] text-[var(--text-muted)]`}>{r.catNumber ?? '—'}</td>
                <td className={td}><span className="text-[10.5px] text-[var(--text-secondary)]">{fmtLabel(r.format)}</span></td>
                <td className={td}>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)] font-mono">
                    {r.condition === 'VGP' ? 'VG+' : r.condition === 'GP' ? 'G+' : r.condition}
                  </span>
                </td>
                <td className={`${td} text-right`}>
                  <span className="inline-flex items-center gap-2">
                    <span className="font-mono font-semibold text-[var(--text-primary)]">{r.stock}</span>
                    <StockPill release={r} />
                  </span>
                </td>
                <td className={`${td} text-right whitespace-nowrap`}>
                  <span className="font-mono text-[var(--text-primary)]">{idr.format(r.priceIdr)}</span>
                  <span className="block text-[9.5px] text-[var(--text-faint)]">≈ ${Math.round(r.priceIdr / USD_RATE)}</span>
                </td>
                <td className={`${td} text-[10.5px] text-[var(--text-muted)] whitespace-nowrap`}>
                  {r.storeLocation.replace('_', ' ')}{r.shelfLocation ? ` · ${r.shelfLocation}` : ''}
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      onClick={() => printBarcode(r)}
                      title="Print barcode label"
                      aria-label="Print barcode label"
                      className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]"
                    >
                      <svg viewBox="0 0 24 24" className="w-[14px] h-[14px]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><path d="M3 5v14M7 5v14M11 5v14M14 5v14M18 5v14M21 5v14"/></svg>
                    </button>
                    <Link to={`/inventory/${r.id}/edit`} className="text-[10.5px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">Edit</Link>
                    <button onClick={() => handleDelete(r.id)} className="text-[10.5px] text-[var(--danger)] hover:opacity-75">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginator page={page} limit={50} total={total} shown={releases.length} onPage={setPage} />
      </div>
    </div>
  );
}

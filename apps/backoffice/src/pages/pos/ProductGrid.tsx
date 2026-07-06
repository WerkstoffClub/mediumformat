import { useMemo } from 'react';
import { fmtIdr } from '../../api/ops';
import type { PosCategory, PosProduct } from '../../api/pos';
import { ProductCover } from './Cover';

const CATEGORIES: Array<{ key: PosCategory | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'vinyl', label: 'Vinyl' },
  { key: 'cd', label: 'CD' },
  { key: 'cassette', label: 'Cassette' },
  { key: 'merch', label: 'Merch' },
];

interface ProductGridProps {
  products: PosProduct[];
  loading: boolean;
  search: string;
  onSearch: (v: string) => void;
  category: PosCategory | 'all';
  onCategory: (c: PosCategory | 'all') => void;
  onAdd: (product: PosProduct) => void;
  /** Ids currently in the cart — drives the "added" tile state. */
  inCart: Set<string>;
}

export function ProductGrid({
  products, loading, search, onSearch, category, onCategory, onAdd, inCart,
}: ProductGridProps) {
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: products.length };
    for (const p of products) map[p.category] = (map[p.category] ?? 0) + 1;
    return map;
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      if (category !== 'all' && p.category !== category) return false;
      if (!q) return true;
      return `${p.artist} ${p.title} ${p.formatLabel}`.toLowerCase().includes(q);
    });
  }, [products, search, category]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
      {/* Search */}
      <div className="p-3 border-b border-[var(--border-sub)] flex-shrink-0">
        <div className="flex items-center gap-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-md px-3 py-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[var(--text-faint)] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            className="bg-transparent text-[13px] outline-none text-[var(--text-primary)] placeholder:text-[var(--text-faint)] w-full"
            placeholder="Search artist, title, or format…"
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
        </div>
        {/* Category chips */}
        <div className="flex gap-1.5 flex-wrap mt-2.5">
          {CATEGORIES.map(c => {
            const on = category === c.key;
            return (
              <button
                key={c.key}
                onClick={() => onCategory(c.key)}
                className={`text-[11px] px-3 py-1 rounded-full border transition-colors flex items-center gap-1.5 ${
                  on ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                }`}
              >
                {c.label}
                <span className={`font-mono text-[10px] ${on ? 'text-[var(--text-secondary)]' : 'text-[var(--text-faint)]'}`}>{counts[c.key] ?? 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {loading ? (
          <div className="h-40 flex items-center justify-center text-[12px] text-[var(--text-faint)]">Loading catalogue…</div>
        ) : filtered.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-[12px] text-[var(--text-faint)]">No products match.</div>
        ) : (
          <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
            {filtered.map(p => (
              <ProductTile key={p.id} product={p} added={inCart.has(p.id)} onAdd={() => onAdd(p)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductTile({ product, added, onAdd }: { product: PosProduct; added: boolean; onAdd: () => void }) {
  const soldOut = product.stock <= 0;
  return (
    <button
      onClick={onAdd}
      disabled={soldOut}
      className={`group text-left bg-[var(--bg-base)] border rounded-lg overflow-hidden transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
        added ? 'border-[var(--accent)]' : 'border-[var(--border)] hover:border-[var(--text-muted)]'
      } active:scale-[0.98]`}
    >
      <div className="relative aspect-square w-full overflow-hidden border-b border-[var(--border-sub)]">
        <ProductCover product={product} />
        {added && (
          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center shadow-[0_1px_4px_rgba(0,0,0,.35)]">
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </span>
        )}
        {soldOut && (
          <span className="absolute inset-0 flex items-center justify-center bg-[var(--bg-base)]/70 text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Sold out</span>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[12px] font-medium text-[var(--text-primary)] truncate">{product.artist}</p>
        <p className="text-[11px] text-[var(--text-muted)] truncate">{product.title}</p>
        <div className="flex items-center gap-1 mt-1.5">
          <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-muted)]">{product.formatLabel}</span>
          {product.condition && <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-muted)] font-mono">{condLabel(product.condition)}</span>}
        </div>
        <p className="font-mono text-[12px] text-[var(--text-primary)] mt-2">{fmtIdr(product.priceIdr)}</p>
      </div>
    </button>
  );
}

function condLabel(c: string): string {
  return c === 'VGP' ? 'VG+' : c === 'GP' ? 'G+' : c;
}

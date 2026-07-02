import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getReleases, deleteRelease, type ReleaseFilter } from '../../api/inventory';
import { Badge } from '../../components/ui/Badge';
import type { Release } from '@mf/shared';

const CONDITION_VARIANT: Record<string, 'success' | 'brand' | 'warning' | 'danger' | 'neutral'> = {
  M: 'success', VGP: 'brand', VG: 'warning', GP: 'warning', G: 'danger', F: 'danger', P: 'danger',
};

export function InventoryList() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') ?? '';
  const [loading, setLoading]   = useState(false);

  const load = useCallback(async (filter: ReleaseFilter) => {
    setLoading(true);
    try {
      const res = await getReleases(filter);
      setReleases(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load({ page, limit: 50, q: search || undefined });
  }, [page, search, load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this release?')) return;
    await deleteRelease(id);
    load({ page, limit: 50 });
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-3 py-1.5 flex-1 max-w-xs">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[var(--text-faint)] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className="bg-transparent text-[11px] outline-none text-[var(--text-primary)] placeholder:text-[var(--text-faint)] w-full"
            placeholder="Search artist, title..."
            value={search}
            onChange={e => {
              setSearchParams(e.target.value ? { q: e.target.value } : {}, { replace: true });
              setPage(1);
            }}
          />
        </div>
        <div className="flex-1" />
        <Link
          to="/inventory/new"
          className="px-3 py-1.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-[11px] font-bold rounded-md transition-colors"
        >
          + Add Release
        </Link>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-[#0d0d0d]">
              {['Release', 'Format', 'Condition', 'Price (IDR)', 'Stock', 'Location', ''].map(h => (
                <th key={h} className="text-left px-3.5 py-2 text-[9px] uppercase tracking-[0.07em] text-[var(--text-faint)] font-semibold border-b border-[var(--border-sub)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-3.5 py-6 text-center text-[var(--text-faint)]">Loading...</td></tr>
            )}
            {!loading && releases.length === 0 && (
              <tr><td colSpan={7} className="px-3.5 py-8 text-center text-[var(--text-faint)]">No releases yet. Add one to get started.</td></tr>
            )}
            {releases.map(r => (
              <tr key={r.id} className="group border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)]">
                <td className="px-3.5 py-2.5">
                  <p className="font-semibold text-[var(--text-primary)]">{r.title}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{r.artist}{r.label ? ` · ${r.label}` : ''}</p>
                </td>
                <td className="px-3.5 py-2.5"><Badge variant="neutral">{r.format}</Badge></td>
                <td className="px-3.5 py-2.5">
                  <Badge variant={CONDITION_VARIANT[r.condition] ?? 'neutral'}>{r.condition}</Badge>
                </td>
                <td className="px-3.5 py-2.5 font-semibold text-[var(--text-primary)]">
                  {r.priceIdr.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                </td>
                <td className="px-3.5 py-2.5">
                  <span className={
                    r.stock === 0 ? 'text-[var(--danger)] font-bold' :
                    r.stock <= r.lowStockThreshold ? 'text-[var(--warning)] font-bold' :
                    'text-[var(--success)] font-bold'
                  }>
                    {r.stock}
                  </span>
                </td>
                <td className="px-3.5 py-2.5 text-[var(--text-muted)]">
                  {r.storeLocation.replace('_', ' ')}{r.shelfLocation ? ` · ${r.shelfLocation}` : ''}
                </td>
                <td className="px-3.5 py-2.5">
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link to={`/inventory/${r.id}/edit`} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[10px]">Edit</Link>
                    <button onClick={() => handleDelete(r.id)} className="text-[var(--danger)] text-[10px] hover:opacity-75">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center px-3.5 py-2 border-t border-[var(--border-sub)] text-[10px] text-[var(--text-faint)] gap-2">
          <span>Showing {releases.length > 0 ? (page - 1) * 50 + 1 : 0}–{Math.min(page * 50, total)} of {total}</span>
          <div className="flex-1" />
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-2 py-0.5 border border-[var(--border)] rounded disabled:opacity-30">‹</button>
          <button disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)} className="px-2 py-0.5 border border-[var(--border)] rounded disabled:opacity-30">›</button>
        </div>
      </div>
    </div>
  );
}

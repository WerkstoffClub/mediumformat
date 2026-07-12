import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listCategoryPages,
  deleteCategoryPage,
  type CategoryPage,
  type CategoryPageFilter,
} from '../../api/categoryPages';
import { Badge } from '../../components/ui/Badge';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'neutral'> = {
  PUBLISHED: 'success',
  DRAFT: 'warning',
};

const TEMPLATE_LABELS: Record<string, string> = {
  FULL_HERO: 'Full hero',
  HALF_HERO: 'Half hero',
};

const FORMAT_LABELS: Record<string, string> = {
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

export function CategoryPagesList() {
  const [pages, setPages]     = useState<CategoryPage[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [filter, setFilter]   = useState<CategoryPageFilter>({});
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (f: CategoryPageFilter) => {
    setLoading(true);
    try {
      const res = await listCategoryPages({ ...f, limit: 50 });
      setPages(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load({ ...filter, page, search: search || undefined });
  }, [page, filter, search, load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category page?')) return;
    await deleteCategoryPage(id);
    load({ ...filter, page, search: search || undefined });
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-[18px] font-black tracking-tight text-[var(--text-primary)]">
          Category pages
        </h1>
        <div className="flex-1" />
        <input
          type="search"
          placeholder="Search title or slug…"
          className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-2 py-1.5 text-[11px] text-[var(--text-primary)] outline-none w-[200px]"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-2 py-1.5 text-[11px] text-[var(--text-primary)] outline-none"
          value={filter.status ?? ''}
          onChange={e => { setFilter(f => ({ ...f, status: e.target.value as CategoryPage['status'] || undefined })); setPage(1); }}
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
        <select
          className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-2 py-1.5 text-[11px] text-[var(--text-primary)] outline-none"
          value={filter.template ?? ''}
          onChange={e => { setFilter(f => ({ ...f, template: e.target.value as CategoryPage['template'] || undefined })); setPage(1); }}
        >
          <option value="">All templates</option>
          <option value="FULL_HERO">Full hero</option>
          <option value="HALF_HERO">Half hero</option>
        </select>
        <Link
          to="/category-pages/new"
          className="px-3 py-1.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--accent-text)] text-[11px] font-bold rounded-md transition-colors"
        >
          + New page
        </Link>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-[#0d0d0d]">
              {['Title', 'Slug', 'Template', 'Format filter', 'Status', 'Updated', ''].map(h => (
                <th key={h} className="text-left px-3.5 py-2 text-[9px] uppercase tracking-[0.07em] text-[var(--text-faint)] font-semibold border-b border-[var(--border-sub)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-3.5 py-6 text-center text-[var(--text-faint)]">Loading…</td></tr>
            )}
            {!loading && pages.length === 0 && (
              <tr><td colSpan={7} className="px-3.5 py-8 text-center text-[var(--text-faint)]">No category pages yet. Create your first one.</td></tr>
            )}
            {pages.map(p => (
              <tr key={p.id} className="group border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)]">
                <td className="px-3.5 py-2.5">
                  <p className="font-semibold text-[var(--text-primary)]">{p.title}</p>
                  {p.headline && (
                    <p className="text-[10px] text-[var(--text-muted)] line-clamp-1">{p.headline}</p>
                  )}
                </td>
                <td className="px-3.5 py-2.5 text-[var(--text-muted)] font-mono">/pages/{p.slug}</td>
                <td className="px-3.5 py-2.5">
                  <Badge variant="brand">{TEMPLATE_LABELS[p.template] ?? p.template}</Badge>
                </td>
                <td className="px-3.5 py-2.5 text-[var(--text-muted)]">
                  {p.formatFilter ? FORMAT_LABELS[p.formatFilter] ?? p.formatFilter : '—'}
                </td>
                <td className="px-3.5 py-2.5">
                  <Badge variant={STATUS_VARIANT[p.status] ?? 'neutral'}>{p.status}</Badge>
                </td>
                <td className="px-3.5 py-2.5 text-[var(--text-muted)]">
                  {new Date(p.updatedAt).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </td>
                <td className="px-3.5 py-2.5">
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      to={`/category-pages/${p.id}/edit`}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[10px]"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-[var(--danger)] text-[10px] hover:opacity-75"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center px-3.5 py-2 border-t border-[var(--border-sub)] text-[10px] text-[var(--text-faint)] gap-2">
          <span>{total} page{total === 1 ? '' : 's'} total</span>
          <div className="flex-1" />
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-2 py-0.5 border border-[var(--border)] rounded disabled:opacity-30"
          >
            ‹
          </button>
          <button
            disabled={page * 50 >= total}
            onClick={() => setPage(p => p + 1)}
            className="px-2 py-0.5 border border-[var(--border)] rounded disabled:opacity-30"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

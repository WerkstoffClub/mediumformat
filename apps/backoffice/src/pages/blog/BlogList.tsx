import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getPosts, deletePost, type Post, type PostFilter } from '../../api/posts';
import { Badge } from '../../components/ui/Badge';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'neutral'> = {
  PUBLISHED: 'success', DRAFT: 'warning', ARCHIVED: 'neutral',
};

const CATEGORY_LABELS: Record<string, string> = {
  STAFF_PICKS: 'Staff Picks',
  HIGHLIGHTS: 'Highlights',
  NEWS: 'News',
  INTERVIEW: 'Interview',
};

export function BlogList() {
  const [posts, setPosts]     = useState<Post[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [filter, setFilter]   = useState<PostFilter>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (f: PostFilter) => {
    setLoading(true);
    try {
      const res = await getPosts({ ...f, limit: 20 });
      setPosts(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load({ ...filter, page }); }, [page, filter, load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    await deletePost(id);
    load({ ...filter, page });
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-[18px] font-black tracking-tight text-[var(--text-primary)]">Blog</h1>
        <div className="flex-1" />
        <select
          className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-2 py-1.5 text-[11px] text-[var(--text-primary)] outline-none"
          value={filter.category ?? ''}
          onChange={e => { setFilter(f => ({ ...f, category: e.target.value as Post['category'] || undefined })); setPage(1); }}
        >
          <option value="">All Categories</option>
          <option value="STAFF_PICKS">Staff Picks</option>
          <option value="HIGHLIGHTS">Highlights</option>
          <option value="NEWS">News</option>
          <option value="INTERVIEW">Interview</option>
        </select>
        <select
          className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-2 py-1.5 text-[11px] text-[var(--text-primary)] outline-none"
          value={filter.status ?? ''}
          onChange={e => { setFilter(f => ({ ...f, status: e.target.value as Post['status'] || undefined })); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <Link
          to="/blog/new"
          className="px-3 py-1.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-[11px] font-bold rounded-md transition-colors"
        >
          + New Post
        </Link>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-[#0d0d0d]">
              {['Title', 'Category', 'Status', 'Author', 'Date', ''].map(h => (
                <th key={h} className="text-left px-3.5 py-2 text-[9px] uppercase tracking-[0.07em] text-[var(--text-faint)] font-semibold border-b border-[var(--border-sub)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3.5 py-6 text-center text-[var(--text-faint)]">Loading...</td></tr>}
            {!loading && posts.length === 0 && (
              <tr><td colSpan={6} className="px-3.5 py-8 text-center text-[var(--text-faint)]">No posts yet. Write your first post.</td></tr>
            )}
            {posts.map(p => (
              <tr key={p.id} className="group border-b border-[var(--border-sub)] hover:bg-[var(--bg-hover)]">
                <td className="px-3.5 py-2.5">
                  <p className="font-semibold text-[var(--text-primary)]">{p.title}</p>
                  <p className="text-[10px] text-[var(--text-muted)] font-mono">{p.slug}</p>
                </td>
                <td className="px-3.5 py-2.5"><Badge variant="brand">{CATEGORY_LABELS[p.category] ?? p.category}</Badge></td>
                <td className="px-3.5 py-2.5"><Badge variant={STATUS_VARIANT[p.status] ?? 'neutral'}>{p.status}</Badge></td>
                <td className="px-3.5 py-2.5 text-[var(--text-muted)]">{p.author.name}</td>
                <td className="px-3.5 py-2.5 text-[var(--text-muted)]">
                  {p.publishedAt
                    ? new Date(p.publishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—'}
                </td>
                <td className="px-3.5 py-2.5">
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link to={`/blog/${p.id}/edit`} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[10px]">Edit</Link>
                    <button onClick={() => handleDelete(p.id)} className="text-[var(--danger)] text-[10px] hover:opacity-75">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center px-3.5 py-2 border-t border-[var(--border-sub)] text-[10px] text-[var(--text-faint)] gap-2">
          <span>{total} posts total</span>
          <div className="flex-1" />
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-2 py-0.5 border border-[var(--border)] rounded disabled:opacity-30">‹</button>
          <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="px-2 py-0.5 border border-[var(--border)] rounded disabled:opacity-30">›</button>
        </div>
      </div>
    </div>
  );
}

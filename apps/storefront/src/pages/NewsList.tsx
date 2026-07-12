import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPosts } from '../api/storefront';
import type { Post } from '../api/storefront';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function NewsList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPosts()
      .then((data) => !cancelled && setPosts(data))
      .catch((e: Error) => !cancelled && setError(e?.message ?? 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-10">
      <header className="mb-10">
        <div
          className="text-[12px] font-medium uppercase tracking-wider mb-1"
          style={{ color: 'var(--mute)' }}
        >
          Journal
        </div>
        <h1
          className="text-[28px] md:text-[32px] font-semibold"
          style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}
        >
          News from the shop
        </h1>
      </header>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <LoadingSkeleton count={6} height={220} />
        </div>
      ) : error ? (
        <div
          className="text-[13px] py-6 px-4 rcard"
          style={{ color: 'var(--danger)', background: 'var(--danger-t)' }}
        >
          Could not load posts: {error}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center text-[13px] py-16 rcard" style={{ color: 'var(--mute)' }}>
          No posts yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <Link to={`/news/${encodeURIComponent(post.slug)}`} className="rcard block">
      {post.coverUrl && (
        <div className="aspect-[16/10]" style={{ background: 'var(--raised)' }}>
          <img
            src={post.coverUrl}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-5">
        <div
          className="text-[11px] font-medium uppercase tracking-wider mb-2 flex items-center gap-2"
          style={{ color: 'var(--mute)' }}
        >
          <span>{post.category}</span>
          {post.publishedAt && (
            <>
              <span aria-hidden>·</span>
              <span className="mono">{formatDate(post.publishedAt)}</span>
            </>
          )}
        </div>
        <h2
          className="text-[18px] font-semibold mb-2"
          style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
        >
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="text-[13px] leading-relaxed line-clamp-3" style={{ color: 'var(--body)' }}>
            {post.excerpt}
          </p>
        )}
      </div>
    </Link>
  );
}

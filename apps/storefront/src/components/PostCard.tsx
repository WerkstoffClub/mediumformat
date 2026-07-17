import { Link } from 'react-router-dom';
import type { Post } from '../api/storefront';

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface PostCardProps {
  post: Post;
  /** Spans 2 columns on lg screens with a larger cover/title — used for the lead post. */
  featured?: boolean;
}

/**
 * News/journal post card per `.mf-post-*` recipe (styles in `index.css`).
 * Shared by `NewsList` (all-posts index) and `CategoryPage` (NEWS_CATEGORY kind).
 */
export function PostCard({ post, featured }: PostCardProps) {
  return (
    <Link
      to={`/news/${encodeURIComponent(post.slug)}`}
      className={featured ? 'mf-post-card featured' : 'mf-post-card'}
    >
      <div className="mf-post-cover">
        {post.coverUrl ? (
          <img src={post.coverUrl} alt="" loading="lazy" />
        ) : (
          <div className="cover-art"><div className="grooves" /></div>
        )}
      </div>
      <div className="mf-post-body">
        <span className="mf-post-badge">
          <span className="mf-post-badge-dot" aria-hidden />
          {post.category}
        </span>
        <h2 className="mf-post-title">{post.title}</h2>
        {post.excerpt && <p className="mf-post-excerpt">{post.excerpt}</p>}
        <div className="mf-post-meta">
          <span className="mf-post-byline mono">
            {post.publishedAt ? formatDate(post.publishedAt) : 'Draft'}
          </span>
          <span className="mf-post-read">
            Read
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

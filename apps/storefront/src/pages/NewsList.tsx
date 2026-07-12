import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listPosts } from '../api/storefront';
import type { Post } from '../api/storefront';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

/** Category chips shown at the top of the index. The `all` chip clears the filter. */
const CATEGORY_CHIPS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All posts' },
  { value: 'staff picks', label: 'Staff Picks' },
  { value: 'highlights', label: 'Highlights' },
  { value: 'news', label: 'News' },
  { value: 'interview', label: 'Interview' },
];

const PAGE_SIZE = 12;

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Normalise a category value for chip comparison. */
const normalise = (raw: string | null | undefined): string =>
  (raw ?? '').trim().toLowerCase();

export default function NewsList() {
  const [params, setParams] = useSearchParams();
  const activeCategory = normalise(params.get('category')) || 'all';
  const [posts, setPosts] = useState<Post[]>([]);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listPosts()
      .then((data) => !cancelled && setPosts(data))
      .catch((e: Error) => !cancelled && setError(e?.message ?? 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset pagination whenever the category filter changes.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [activeCategory]);

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return posts;
    return posts.filter((p) => normalise(p.category) === activeCategory);
  }, [posts, activeCategory]);

  const shown = filtered.slice(0, visible);
  const hasMore = filtered.length > visible;

  function selectCategory(next: string) {
    const p = new URLSearchParams(params);
    if (next === 'all') p.delete('category');
    else p.set('category', next);
    setParams(p, { replace: true });
  }

  return (
    <>
      {/* ── Page header ────────────────────────────────────────────────── */}
      <section className="mf-news-hero">
        <div className="mf-news-hero-inner">
          <div className="mf-news-kicker">Journal</div>
          <h1 className="mf-news-h1">
            News from <em>Medium Format</em>
          </h1>
          <p className="mf-news-lede">
            Reviews, staff picks, and long-reads on the records passing across the counter — plus
            interviews and shop updates from Jakarta.
          </p>
        </div>
      </section>

      <div className="max-w-[1200px] mx-auto px-6 pt-8 pb-16">
        {/* ── Category chips ─────────────────────────────────────────── */}
        <div className="mf-chip-row" role="tablist" aria-label="Filter by category">
          {CATEGORY_CHIPS.map((c) => {
            const on = activeCategory === c.value;
            return (
              <button
                key={c.value}
                type="button"
                role="tab"
                aria-selected={on}
                className={on ? 'mf-cat-chip on' : 'mf-cat-chip'}
                onClick={() => selectCategory(c.value)}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* ── Grid ───────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
            <LoadingSkeleton count={6} height={280} />
          </div>
        ) : error ? (
          <div
            className="text-[13px] py-6 px-4 rcard mt-8"
            style={{ color: 'var(--danger)', background: 'var(--danger-t)' }}
          >
            Could not load posts: {error}
          </div>
        ) : shown.length === 0 ? (
          <div
            className="text-center py-16 rcard mt-8"
            style={{ color: 'var(--mute)' }}
          >
            <div className="text-[14px] mb-2" style={{ color: 'var(--ink)', fontWeight: 500 }}>
              Nothing here yet
            </div>
            <div className="text-[13px]">
              {activeCategory === 'all'
                ? 'No posts have been published yet — check back soon.'
                : 'No posts in this category yet.'}
            </div>
            {activeCategory !== 'all' && (
              <button
                type="button"
                className="btn-secondary mt-4"
                onClick={() => selectCategory('all')}
              >
                See all posts
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mf-news-grid mt-8">
              {shown.map((p, i) => (
                <PostCard key={p.id} post={p} featured={i === 0 && activeCategory === 'all'} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-10">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                >
                  Load more posts
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        /* Page header */
        .mf-news-hero {
          background: var(--surface);
          border-bottom: 1px solid var(--hairline);
          padding: 56px 24px 44px;
        }
        .mf-news-hero-inner {
          max-width: 1200px;
          margin: 0 auto;
        }
        .mf-news-kicker {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--mute);
          margin-bottom: 14px;
        }
        .mf-news-h1 {
          font: 700 clamp(30px, 4.4vw, 48px)/1.08 "Geist", "Helvetica Neue", Arial, sans-serif;
          letter-spacing: -0.05em;
          color: var(--ink);
          margin: 0;
          max-width: 18ch;
        }
        .mf-news-h1 em {
          font-style: normal;
          color: var(--mute);
        }
        .mf-news-lede {
          margin-top: 18px;
          font-size: 16px;
          line-height: 1.6;
          color: var(--body);
          max-width: 60ch;
        }

        /* Chips */
        .mf-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding-bottom: 4px;
        }
        .mf-cat-chip {
          font: 500 13px/1 "Geist", "Helvetica Neue", Arial, sans-serif;
          color: var(--body);
          background: transparent;
          border: 1px solid var(--hairline);
          border-radius: var(--r-pill);
          padding: 8px 14px;
          cursor: pointer;
          transition: background .15s, color .15s, border-color .15s;
        }
        .mf-cat-chip:hover {
          color: var(--ink);
          border-color: var(--mute);
        }
        .mf-cat-chip.on {
          background: var(--accent);
          color: var(--accent-text);
          border-color: var(--accent);
        }

        /* News grid — featured spans 2 columns on lg screens */
        .mf-news-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 768px) {
          .mf-news-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (min-width: 1024px) {
          .mf-news-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .mf-news-grid .mf-post-card.featured {
            grid-column: span 2;
            display: grid;
            grid-template-columns: 1.15fr 1fr;
            grid-template-rows: auto;
          }
          .mf-news-grid .mf-post-card.featured .mf-post-cover {
            aspect-ratio: auto;
            height: 100%;
            border-right: 1px solid var(--hairline);
            border-bottom: none;
          }
          .mf-news-grid .mf-post-card.featured .mf-post-body {
            padding: 28px 28px 28px 24px;
            justify-content: center;
          }
          .mf-news-grid .mf-post-card.featured .mf-post-title {
            font-size: 26px;
          }
          .mf-news-grid .mf-post-card.featured .mf-post-excerpt {
            font-size: 15px;
          }
        }

        .mf-post-card {
          background: var(--surface);
          border: 1px solid var(--hairline);
          border-radius: var(--r-lg);
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
          transition: border-color .2s, transform .2s;
        }
        .mf-post-card:hover {
          border-color: var(--mute);
          transform: translateY(-2px);
        }
        .mf-post-cover {
          background: var(--raised);
          border-bottom: 1px solid var(--hairline);
          aspect-ratio: 16 / 10;
          overflow: hidden;
        }
        .mf-post-cover img {
          width: 100%; height: 100%;
          display: block;
          object-fit: cover;
        }
        .mf-post-cover .cover-art { width: 100%; height: 100%; }
        .mf-post-body {
          padding: 20px 20px 22px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
        }
        .mf-post-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 500;
          padding: 3px 10px;
          border-radius: var(--r-pill);
          border: 1px solid var(--hairline);
          color: var(--body);
          background: transparent;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          width: fit-content;
        }
        .mf-post-badge-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: currentColor;
        }
        .mf-post-title {
          font-size: 20px;
          font-weight: 600;
          line-height: 1.3;
          letter-spacing: -0.025em;
          color: var(--ink);
          margin: 0;
        }
        .mf-post-excerpt {
          font-size: 14px;
          line-height: 1.6;
          color: var(--body);
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .mf-post-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: auto;
          padding-top: 8px;
          border-top: 1px solid var(--hairline);
        }
        .mf-post-byline {
          font-size: 12px;
          color: var(--mute);
        }
        .mf-post-read {
          font-size: 12px;
          font-weight: 500;
          color: var(--ink);
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .mf-post-read svg { transition: transform .15s; width: 12px; height: 12px; }
        .mf-post-card:hover .mf-post-read svg { transform: translateX(3px); }
      `}</style>
    </>
  );
}

function PostCard({ post, featured }: { post: Post; featured?: boolean }) {
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

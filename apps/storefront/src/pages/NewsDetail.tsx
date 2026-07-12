import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPost } from '../api/storefront';
import type { Post } from '../api/storefront';
import { renderMarkdown } from '../lib/markdown';

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function NewsDetail() {
  const { slug = '' } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPost(null);
    getPost(slug)
      .then((data) => {
        if (cancelled) return;
        if (!data) setError('Not found');
        else setPost(data);
      })
      .catch((e: Error) => !cancelled && setError(e?.message ?? 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div
        className="max-w-[720px] mx-auto px-6 py-16 text-[14px]"
        style={{ color: 'var(--mute)' }}
      >
        Loading…
      </div>
    );
  }
  if (error === 'Not found') {
    return (
      <div className="max-w-[600px] mx-auto px-6 py-24 text-center">
        <h1 className="text-[24px] font-semibold mb-3" style={{ color: 'var(--ink)' }}>
          Post not found
        </h1>
        <p className="text-[14px] mb-6" style={{ color: 'var(--body)' }}>
          That URL doesn't match a post.
        </p>
        <Link to="/news" className="btn-primary">← Back to journal</Link>
      </div>
    );
  }
  if (error || !post) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="text-[13px] py-6 px-4 rcard" style={{ color: 'var(--danger)', background: 'var(--danger-t)' }}>
          Could not load: {error ?? 'unknown error'}
        </div>
      </div>
    );
  }

  return (
    <>
      <article className="max-w-[720px] mx-auto px-6 py-14">
        <nav className="text-[12px] mb-6" style={{ color: 'var(--mute)' }}>
          <Link to="/news" style={{ color: 'var(--body)' }}>Journal</Link>
          <span className="mx-2">/</span>
          <span>{post.category}</span>
        </nav>
        <header className="mb-8">
          <div
            className="text-[12px] font-medium uppercase tracking-wider mb-3 flex items-center gap-2"
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
          <h1
            className="text-[32px] md:text-[40px] font-semibold leading-[1.15]"
            style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}
          >
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="text-[16px] mt-4 leading-relaxed" style={{ color: 'var(--body)' }}>
              {post.excerpt}
            </p>
          )}
        </header>
        {post.coverUrl && (
          <div
            className="aspect-[16/9] mb-8 rcard"
            style={{ background: 'var(--raised)' }}
          >
            <img
              src={post.coverUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div
          className="prose-mf"
          // Markdown source is sanitized (HTML-escaped) inside renderMarkdown
          // before inline patterns are re-inserted, so dangerouslySetInnerHTML is safe here.
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body ?? '') }}
        />
      </article>
      <style>{`
        .prose-mf {
          color: var(--body);
          font-size: 15px;
          line-height: 1.7;
        }
        .prose-mf h1, .prose-mf h2, .prose-mf h3 {
          color: var(--ink);
          font-weight: 600;
          letter-spacing: -0.02em;
          margin-top: 1.6em;
          margin-bottom: 0.6em;
        }
        .prose-mf h1 { font-size: 26px; }
        .prose-mf h2 { font-size: 22px; }
        .prose-mf h3 { font-size: 18px; }
        .prose-mf p { margin: 0 0 1em 0; }
        .prose-mf a {
          color: var(--ink);
          border-bottom: 1px solid var(--hairline);
          transition: border-color .15s;
        }
        .prose-mf a:hover { border-color: var(--ink); }
        .prose-mf strong { color: var(--ink); font-weight: 600; }
        .prose-mf ul, .prose-mf ol { padding-left: 1.4em; margin: 0 0 1em 0; }
        .prose-mf li { margin-bottom: 0.4em; }
        .prose-mf blockquote {
          border-left: 2px solid var(--hairline);
          padding-left: 1em;
          color: var(--mute);
          margin: 1.4em 0;
        }
        .prose-mf hr { border: none; border-top: 1px solid var(--hairline); margin: 2em 0; }
        .prose-mf code {
          font-family: "Noto Sans Mono", ui-monospace, monospace;
          font-size: 0.9em;
          background: var(--raised);
          border: 1px solid var(--hairline);
          border-radius: var(--r-sm);
          padding: 1px 6px;
        }
        .prose-mf img {
          max-width: 100%;
          height: auto;
          border-radius: var(--r-lg);
          border: 1px solid var(--hairline);
          margin: 1.4em 0;
        }
      `}</style>
    </>
  );
}

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPost, listPosts } from '../api/storefront';
import type { Post } from '../api/storefront';
import { renderMarkdown } from '../lib/markdown';

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Rough read-time estimate from body length. Journalists use ~200 WPM. */
function estimateReadTime(body: string): number {
  const words = body ? body.trim().split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 200));
}

/** Two-letter initial from author id / category, for the byline avatar. */
function initials(source: string | null | undefined): string {
  if (!source) return 'MF';
  const cleaned = source.replace(/[^a-zA-Z ]/g, ' ').trim();
  if (!cleaned) return 'MF';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return (first + second || first || 'M').toUpperCase().slice(0, 2);
}

export default function NewsDetail() {
  const { slug = '' } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [related, setRelated] = useState<Post[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPost(null);
    setRelated([]);

    getPost(slug)
      .then((data) => {
        if (cancelled) return;
        if (!data) setError('Not found');
        else setPost(data);
      })
      .catch((e: Error) => !cancelled && setError(e?.message ?? 'Failed to load'))
      .finally(() => !cancelled && setLoading(false));

    // Recirculation: pull 4 posts, filter out the current one, show up to 3.
    listPosts(4)
      .then((data) => {
        if (cancelled) return;
        setRelated(data.filter((p) => p.slug !== slug).slice(0, 3));
      })
      .catch(() => {
        /* silent — related is optional */
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div
        className="max-w-[820px] mx-auto px-6 py-16 text-[14px]"
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

  const readMin = estimateReadTime(post.body ?? '');
  const heroSrc = post.coverUrl;
  const authorLabel = initials(post.category);

  return (
    <>
      {/* ── Hero: cover image if we have one, otherwise the monochrome disc ── */}
      <header className="mf-art-hero" role="banner">
        {heroSrc ? (
          <img
            src={heroSrc}
            alt=""
            className="mf-art-hero-img"
            loading="eager"
          />
        ) : (
          <div className="mf-hero-groove">
            <div className="mf-hero-disc" aria-hidden />
          </div>
        )}
        <div className="mf-hero-veil" aria-hidden />
        <div className="mf-hero-inner">
          <span className="mf-kicker">{post.category}</span>
          <h1 className="mf-art-h1">{post.title}</h1>
        </div>
      </header>

      {/* ── Byline row ─────────────────────────────────────────────────── */}
      <div className="mf-byline">
        <span className="mf-by-avatar" aria-hidden>{authorLabel}</span>
        <div>
          <div className="mf-by-name">Medium Format</div>
          <div className="mf-by-role">{post.category}</div>
        </div>
        <span className="mf-by-sep" aria-hidden />
        <span className="mf-by-meta mono">
          {post.publishedAt ? formatDate(post.publishedAt) : 'Unpublished'}
        </span>
        <span className="mf-by-spacer" />
        <span className="mf-read-time mono">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          {readMin} min read
        </span>
      </div>

      {/* ── Article body ──────────────────────────────────────────────── */}
      <article className="mf-article">
        <nav className="mf-crumbs" aria-label="Breadcrumb">
          <Link to="/news" className="mf-crumb-link">← Back to News</Link>
        </nav>
        {post.excerpt && (
          <p className="mf-lede">{post.excerpt}</p>
        )}
        <div
          className="prose-mf"
          // Markdown source is sanitized (HTML-escaped) inside renderMarkdown
          // before inline patterns are re-inserted, so dangerouslySetInnerHTML is safe here.
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body ?? '') }}
        />
      </article>

      {/* ── More from the News (recirculation) ─────────────────────────── */}
      {related.length > 0 && (
        <section className="mf-more" aria-labelledby="mf-more-heading">
          <div className="mf-more-inner">
            <div className="mf-sec-hdr">
              <h2 className="mf-sec-h2" id="mf-more-heading">More from the News</h2>
              <Link to="/news" className="mf-sec-link">
                View all
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="mf-jgrid">
              {related.map((r) => (
                <Link key={r.id} to={`/news/${encodeURIComponent(r.slug)}`} className="mf-jcard">
                  <div className="mf-jcover">
                    {r.coverUrl ? (
                      <img src={r.coverUrl} alt="" loading="lazy" />
                    ) : (
                      <div className="cover-art"><div className="grooves" /></div>
                    )}
                  </div>
                  <div className="mf-jbody">
                    <span className="mf-jbadge">
                      <span className="mf-jbadge-dot" aria-hidden />
                      {r.category}
                    </span>
                    <div className="mf-jtitle">{r.title}</div>
                    <div className="mf-jmeta mono">
                      {r.publishedAt ? formatDate(r.publishedAt) : 'Draft'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Local styles: article + recirc + prose typography ─────────── */}
      <style>{`
        /* Full-bleed hero */
        .mf-art-hero {
          position: relative;
          height: clamp(320px, 42vw, 460px);
          border-bottom: 1px solid var(--hairline);
          overflow: hidden;
          background: var(--surface);
        }
        .mf-art-hero-img {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover;
        }
        .mf-hero-groove {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .mf-hero-disc {
          width: 560px; height: 560px; max-width: 120vw;
          border-radius: 50%;
          background: repeating-radial-gradient(circle at 50% 50%, #000 0 5px, #191919 5px 10px);
          opacity: 0.5;
        }
        html[data-theme="light"] .mf-hero-disc {
          background: repeating-radial-gradient(circle at 50% 50%, #dedede 0 5px, #fff 5px 10px);
          opacity: 0.7;
        }
        .mf-hero-disc::after {
          content: "";
          position: absolute; inset: 44%;
          border-radius: 50%;
          background: var(--accent);
          opacity: 0.6;
        }
        .mf-hero-veil {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,.25), var(--canvas) 98%);
          pointer-events: none;
        }
        html[data-theme="light"] .mf-hero-veil {
          background: linear-gradient(180deg, rgba(255,255,255,.15), var(--canvas) 98%);
        }
        .mf-hero-inner {
          position: absolute; inset: 0;
          max-width: 820px;
          margin: 0 auto;
          padding: 0 24px 36px;
          display: flex; flex-direction: column; justify-content: flex-end;
          z-index: 2;
        }
        .mf-kicker {
          display: inline-block;
          font: 500 12px/1 "Geist", "Helvetica Neue", Arial, sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--accent-text);
          background: var(--accent);
          padding: 5px 12px;
          border-radius: var(--r-pill);
          width: fit-content;
          margin-bottom: 18px;
        }
        .mf-art-h1 {
          font: 700 clamp(28px, 4.6vw, 48px) / 1.08 "Geist", "Helvetica Neue", Arial, sans-serif;
          letter-spacing: -0.055em;
          color: var(--ink);
          max-width: 15ch;
          margin: 0;
        }

        /* Byline */
        .mf-byline {
          max-width: 820px;
          margin: 0 auto;
          padding: 22px 24px;
          display: flex; align-items: center; gap: 14px;
          border-bottom: 1px solid var(--hairline);
          flex-wrap: wrap;
        }
        .mf-by-avatar {
          width: 40px; height: 40px;
          border-radius: 50%;
          background: var(--raised);
          border: 1px solid var(--hairline);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 600;
          color: var(--ink);
          flex-shrink: 0;
        }
        .mf-by-name { font-size: 14px; font-weight: 600; color: var(--ink); }
        .mf-by-role { font-size: 12px; color: var(--mute); margin-top: 1px; }
        .mf-by-sep { width: 1px; height: 26px; background: var(--hairline); }
        .mf-by-meta { font-size: 12px; color: var(--mute); }
        .mf-by-spacer { flex: 1; }
        .mf-read-time {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; color: var(--mute);
        }
        .mf-read-time svg { width: 13px; height: 13px; }

        /* Article body */
        .mf-article {
          max-width: 720px;
          margin: 0 auto;
          padding: 36px 24px 12px;
        }
        .mf-crumbs { margin-bottom: 20px; }
        .mf-crumb-link {
          font-size: 12px;
          font-weight: 500;
          color: var(--mute);
          text-decoration: none;
          transition: color .15s;
        }
        .mf-crumb-link:hover { color: var(--ink); }
        .mf-lede {
          font-size: 19px;
          line-height: 1.6;
          color: var(--ink);
          font-weight: 400;
          margin: 0 0 28px 0;
          letter-spacing: -0.01em;
        }

        /* Prose recipe — mirrors the journal mockup's typographic voice */
        .prose-mf {
          color: var(--body);
          font-size: 17px;
          line-height: 1.75;
        }
        .prose-mf p { margin: 0 0 22px 0; }
        .prose-mf p strong { color: var(--ink); font-weight: 600; }
        .prose-mf h1, .prose-mf h2, .prose-mf h3 {
          color: var(--ink);
          font-weight: 600;
          letter-spacing: -0.03em;
          margin-top: 38px;
          margin-bottom: 16px;
        }
        .prose-mf h1 { font-size: 28px; }
        .prose-mf h2 {
          font-size: 24px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--hairline);
        }
        .prose-mf h3 { font-size: 19px; }
        .prose-mf a {
          color: var(--ink);
          border-bottom: 1px solid var(--hairline);
          transition: border-color .15s;
        }
        .prose-mf a:hover { border-color: var(--ink); }
        .prose-mf ul, .prose-mf ol {
          padding-left: 1.4em;
          margin: 0 0 22px 0;
        }
        .prose-mf li { margin-bottom: 0.4em; }
        .prose-mf blockquote {
          margin: 34px 0;
          padding: 8px 0 8px 26px;
          border-left: 3px solid var(--accent);
        }
        .prose-mf blockquote p {
          font-size: 22px;
          line-height: 1.4;
          font-weight: 500;
          letter-spacing: -0.025em;
          color: var(--ink);
          margin-bottom: 12px;
        }
        .prose-mf blockquote p:last-child { margin-bottom: 0; }
        .prose-mf hr {
          border: none;
          border-top: 1px solid var(--hairline);
          margin: 2em 0;
        }
        .prose-mf code {
          font-family: "Geist", "Helvetica Neue", Arial, sans-serif;
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

        /* More from the News */
        .mf-more {
          background: var(--surface);
          border-top: 1px solid var(--hairline);
          padding: 52px 24px;
          margin-top: 44px;
        }
        .mf-more-inner { max-width: 1180px; margin: 0 auto; }
        .mf-sec-hdr {
          display: flex; align-items: baseline; justify-content: space-between;
          margin-bottom: 28px;
        }
        .mf-sec-h2 {
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.03em;
          color: var(--ink);
          margin: 0;
        }
        .mf-sec-link {
          font-size: 13px;
          font-weight: 500;
          color: var(--ink);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .mf-sec-link svg { transition: transform .2s; }
        .mf-sec-link:hover svg { transform: translateX(3px); }
        .mf-jgrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .mf-jcard {
          background: var(--surface);
          border: 1px solid var(--hairline);
          border-radius: var(--r-lg);
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          display: block;
          transition: border-color .2s, transform .2s;
        }
        .mf-jcard:hover {
          border-color: var(--mute);
          transform: translateY(-2px);
        }
        .mf-jcover {
          height: 148px;
          border-bottom: 1px solid var(--hairline);
          background: var(--raised);
          overflow: hidden;
        }
        .mf-jcover img {
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
        }
        .mf-jcover .cover-art { width: 100%; height: 100%; }
        .mf-jbody { padding: 18px; }
        .mf-jbadge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 500;
          padding: 3px 9px;
          border-radius: var(--r-pill);
          margin-bottom: 12px;
          border: 1px solid var(--hairline);
          color: var(--body);
        }
        .mf-jbadge-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: currentColor;
        }
        .mf-jtitle {
          font-size: 16px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: var(--ink);
          line-height: 1.4;
          margin-bottom: 9px;
        }
        .mf-jmeta { font-size: 12px; color: var(--mute); }

        @media (max-width: 768px) {
          .mf-art-hero { height: 320px; }
          .mf-jgrid { grid-template-columns: 1fr; }
          .prose-mf { font-size: 16px; }
          .prose-mf blockquote p { font-size: 19px; }
        }
      `}</style>
    </>
  );
}

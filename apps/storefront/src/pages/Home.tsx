import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listReleases, listPosts } from '../api/storefront';
import type { Release, Post } from '../api/storefront';
import { ReleaseCard, Cover } from '../components/ReleaseCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { useCurrency } from '../hooks/useCurrency';

type LoadState<T> = { data: T; loading: boolean; error: string | null };

const initialList = <T,>(): LoadState<T[]> => ({ data: [], loading: true, error: null });

const FEATURED_LIMIT = 12;

const FORMAT_LABEL: Record<string, string> = {
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
const CONDITION_SHORT: Record<string, string> = {
  M: 'M',
  NM: 'NM',
  VG_PLUS: 'VG+',
  VG: 'VG',
  G_PLUS: 'G+',
  G: 'G',
  F: 'F',
  P: 'P',
};

export default function Home() {
  const [featured, setFeatured] = useState<LoadState<Release[]>>(initialList);
  const [posts, setPosts] = useState<LoadState<Post[]>>(initialList);

  useEffect(() => {
    let cancelled = false;

    listReleases({ limit: FEATURED_LIMIT })
      .then((data) => !cancelled && setFeatured({ data, loading: false, error: null }))
      .catch(
        (e) =>
          !cancelled &&
          setFeatured({ data: [], loading: false, error: e?.message ?? 'Error' }),
      );

    listPosts(3)
      .then((data) => !cancelled && setPosts({ data, loading: false, error: null }))
      .catch(
        (e) =>
          !cancelled && setPosts({ data: [], loading: false, error: e?.message ?? 'Error' }),
      );

    return () => {
      cancelled = true;
    };
  }, []);

  const heroPicks: Release[] = featured.data.slice(0, 2);
  const gridReleases: Release[] = featured.data;

  return (
    <>
      <Hero total={featured.data.length} picks={heroPicks} loading={featured.loading} />

      <section aria-label="Featured releases">
        {featured.loading ? (
          <div className="grid-releases">
            <LoadingSkeleton count={8} height={320} />
          </div>
        ) : featured.error ? (
          <div style={{ padding: 20 }}>
            <ErrorNote message={featured.error} />
          </div>
        ) : gridReleases.length === 0 ? (
          <div style={{ padding: 20 }}>
            <EmptyNote>No releases yet — check back soon.</EmptyNote>
          </div>
        ) : (
          <>
            <div className="grid-releases">
              {gridReleases.map((r) => (
                <ReleaseCard key={r.id} release={r} />
              ))}
            </div>
            <div style={{ padding: '4px 20px 24px', textAlign: 'center' }}>
              <Link to="/catalog" className="btn-secondary" style={{ display: 'inline-flex' }}>
                Browse all records →
              </Link>
            </div>
          </>
        )}
      </section>

      <section className="journal" aria-labelledby="journal-heading">
        <div className="sec-hdr">
          <h2 className="sec-h2" id="journal-heading">Latest from the News</h2>
          <Link to="/news" className="sec-link">
            View all{' '}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        {posts.loading ? (
          <div className="jgrid">
            <LoadingSkeleton count={3} height={280} />
          </div>
        ) : posts.error ? (
          <ErrorNote message={posts.error} />
        ) : posts.data.length === 0 ? (
          <EmptyNote>No posts yet.</EmptyNote>
        ) : (
          <div className="jgrid">
            {posts.data.map((p) => (
              <PostTile key={p.id} post={p} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

// ---------- Hero ----------

function Hero({
  total,
  picks,
  loading,
}: {
  total: number;
  picks: Release[];
  loading: boolean;
}) {
  return (
    <section className="hero" aria-labelledby="hero-heading">
      <div className="hero-text">
        <p className="hero-eyebrow">Curated · Jakarta</p>
        <h1 className="hero-h1" id="hero-heading">
          The record<br />
          <em>you&rsquo;ve been chasing</em>
        </h1>
        <div className="hero-meta">
          <span className="hero-count">
            <strong>{loading ? '—' : total || 'Fresh'}</strong>{' '}
            {loading ? 'loading' : total ? 'titles in shop' : 'from the crates'}
          </span>
          <span className="hero-sep" />
          <Link to="/catalog" className="hero-cta">
            Browse the catalog{' '}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
      <div className="hero-releases">
        {picks[0] && <HeroCard eyebrow="Featured arrival" release={picks[0]} />}
        {picks[1] && <HeroCard eyebrow="Also new" release={picks[1]} />}
      </div>
    </section>
  );
}

function HeroCard({ eyebrow, release }: { eyebrow: string; release: Release }) {
  const to = release.slug ? `/releases/${encodeURIComponent(release.slug)}` : '#';
  const { formatPrice } = useCurrency();
  const labelBits: string[] = [];
  if (release.label) labelBits.push(release.label);
  if (release.catNumber) labelBits.push(release.catNumber);
  if (release.year !== null && release.year !== undefined) labelBits.push(String(release.year));

  return (
    <div>
      <div className="hero-card-eyebrow">{eyebrow}</div>
      <Link to={to} className="hero-card" aria-label={`${release.artist} — ${release.title}`}>
        <div className="hero-thumb">
          <Cover imageUrl={release.imageUrl} alt={`${release.artist} — ${release.title}`} small />
        </div>
        <div>
          <div className="hci-artist">{release.artist}</div>
          <div className="hci-title">{release.title}</div>
          {labelBits.length > 0 && <div className="hci-label">{labelBits.join(' · ')}</div>}
          <div className="hci-chips">
            <span className="chip fmt">{FORMAT_LABEL[release.format] ?? release.format}</span>
            <span className="chip cond">{CONDITION_SHORT[release.condition] ?? release.condition}</span>
            {release.genre && <span className="chip">{release.genre}</span>}
          </div>
          <div className="hci-price">{formatPrice(release.priceIdr)}</div>
        </div>
      </Link>
    </div>
  );
}

// ---------- News tiles ----------

function PostTile({ post }: { post: Post }) {
  const category = (post.category || '').toLowerCase();
  let badgeClass = 'jbadge';
  if (category.includes('staff')) badgeClass += ' jb-picks';
  else if (category.includes('review')) badgeClass += ' jb-review';
  else badgeClass += ' jb-new';

  const dateStr = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <Link to={`/news/${encodeURIComponent(post.slug)}`} className="jcard">
      <div className="jcover">
        <div className="cover-art" aria-hidden>
          <div className="grooves" />
        </div>
      </div>
      <div className="jbody">
        <span className={badgeClass}>
          <span className="dot" />
          {post.category || 'News'}
        </span>
        <div className="jtitle">{post.title}</div>
        {dateStr && <div className="jmeta">{dateStr}</div>}
      </div>
    </Link>
  );
}

// ---------- Notes ----------

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-center text-[13px] py-12 rcard"
      style={{ color: 'var(--mute)', cursor: 'default' }}
    >
      {children}
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div
      className="text-[13px] py-6 px-4 rcard"
      style={{ color: 'var(--danger)', background: 'var(--danger-t)', cursor: 'default' }}
    >
      Could not load: {message}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listReleases, listPreorders, listPosts } from '../api/storefront';
import type { Release, Post } from '../api/storefront';
import { ReleaseCard } from '../components/ReleaseCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { NewsletterSignup } from '../components/NewsletterSignup';

type LoadState<T> = { data: T; loading: boolean; error: string | null };

const initialList = <T,>(): LoadState<T[]> => ({ data: [], loading: true, error: null });

export default function Home() {
  const [latest, setLatest] = useState<LoadState<Release[]>>(initialList);
  const [preorders, setPreorders] = useState<LoadState<Release[]>>(initialList);
  const [posts, setPosts] = useState<LoadState<Post[]>>(initialList);

  useEffect(() => {
    let cancelled = false;

    listReleases({ limit: 8 })
      .then((data) => !cancelled && setLatest({ data, loading: false, error: null }))
      .catch((e) => !cancelled && setLatest({ data: [], loading: false, error: e?.message ?? 'Error' }));

    listPreorders()
      .then((data) =>
        !cancelled && setPreorders({ data: data.slice(0, 8), loading: false, error: null }),
      )
      .catch((e) => !cancelled && setPreorders({ data: [], loading: false, error: e?.message ?? 'Error' }));

    listPosts(3)
      .then((data) => !cancelled && setPosts({ data, loading: false, error: null }))
      .catch((e) => !cancelled && setPosts({ data: [], loading: false, error: e?.message ?? 'Error' }));

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Hero latestCount={latest.data.length} />
      <StripSection
        eyebrow="Latest"
        title="New arrivals"
        seeAll="/catalog"
      >
        {latest.loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <LoadingSkeleton count={4} height={280} />
          </div>
        ) : latest.error ? (
          <ErrorNote message={latest.error} />
        ) : latest.data.length === 0 ? (
          <EmptyNote>No releases yet — check back soon.</EmptyNote>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {latest.data.slice(0, 8).map((r) => (
              <ReleaseCard key={r.id} release={r} />
            ))}
          </div>
        )}
      </StripSection>

      <StripSection eyebrow="Coming soon" title="Preorders" seeAll="/preorders">
        {preorders.loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <LoadingSkeleton count={4} height={280} />
          </div>
        ) : preorders.error ? (
          <ErrorNote message={preorders.error} />
        ) : preorders.data.length === 0 ? (
          <EmptyNote>No preorders open at the moment.</EmptyNote>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {preorders.data.map((r) => (
              <ReleaseCard key={r.id} release={r} />
            ))}
          </div>
        )}
      </StripSection>

      <StripSection eyebrow="Journal" title="From the news" seeAll="/news">
        {posts.loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LoadingSkeleton count={3} height={200} />
          </div>
        ) : posts.error ? (
          <ErrorNote message={posts.error} />
        ) : posts.data.length === 0 ? (
          <EmptyNote>No posts yet.</EmptyNote>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {posts.data.map((p) => (
              <PostTile key={p.id} post={p} />
            ))}
          </div>
        )}
      </StripSection>

      <section className="max-w-[1200px] mx-auto px-6 py-16">
        <div
          className="rcard p-8 md:p-12"
          style={{ background: 'var(--surface)' }}
        >
          <NewsletterSignup />
        </div>
      </section>
    </>
  );
}

// ------------ Local sub-components ------------

function Hero({ latestCount }: { latestCount: number }) {
  return (
    <section
      className="px-6 py-14 md:py-20"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--hairline)' }}
    >
      <div className="max-w-[1200px] mx-auto">
        <div
          className="text-[12px] font-medium uppercase tracking-wider mb-4"
          style={{ color: 'var(--mute)' }}
        >
          Independent record shop · Jakarta
        </div>
        <h1
          className="text-[40px] md:text-[56px] font-semibold leading-[1.05] max-w-4xl"
          style={{ color: 'var(--ink)', letterSpacing: '-0.06em' }}
        >
          The record <em style={{ fontStyle: 'normal', color: 'var(--mute)' }}>you've been chasing</em>.
        </h1>
        <div className="flex items-center gap-4 mt-6">
          <div className="text-[14px]" style={{ color: 'var(--body)' }}>
            {latestCount > 0 ? (
              <>
                <strong style={{ color: 'var(--ink)' }} className="mono">{latestCount}</strong> new releases
              </>
            ) : (
              <>Curated in-store, shipped nationwide.</>
            )}
          </div>
          <div style={{ width: 1, height: 14, background: 'var(--hairline)' }} />
          <Link
            to="/catalog"
            className="text-[13px] font-medium inline-flex items-center gap-1"
            style={{ color: 'var(--ink)' }}
          >
            Browse catalog →
          </Link>
        </div>
      </div>
    </section>
  );
}

function StripSection({
  eyebrow,
  title,
  seeAll,
  children,
}: {
  eyebrow: string;
  title: string;
  seeAll: string;
  children: React.ReactNode;
}) {
  return (
    <section className="max-w-[1200px] mx-auto px-6 py-10 md:py-14">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div
            className="text-[12px] font-medium uppercase tracking-wider mb-1"
            style={{ color: 'var(--mute)' }}
          >
            {eyebrow}
          </div>
          <h2
            className="text-[24px] md:text-[28px] font-semibold"
            style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}
          >
            {title}
          </h2>
        </div>
        <Link
          to={seeAll}
          className="text-[13px] font-medium"
          style={{ color: 'var(--ink)' }}
        >
          See all →
        </Link>
      </div>
      {children}
    </section>
  );
}

function PostTile({ post }: { post: Post }) {
  return (
    <Link
      to={`/news/${encodeURIComponent(post.slug)}`}
      className="rcard block p-5"
    >
      <div
        className="text-[11px] font-medium uppercase tracking-wider mb-3"
        style={{ color: 'var(--mute)' }}
      >
        {post.category}
      </div>
      <h3
        className="text-[18px] font-semibold mb-2"
        style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
      >
        {post.title}
      </h3>
      {post.excerpt && (
        <p className="text-[13px] leading-relaxed line-clamp-3" style={{ color: 'var(--body)' }}>
          {post.excerpt}
        </p>
      )}
    </Link>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-center text-[13px] py-12 rcard"
      style={{ color: 'var(--mute)' }}
    >
      {children}
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div
      className="text-[13px] py-6 px-4 rcard"
      style={{ color: 'var(--danger)', background: 'var(--danger-t)' }}
    >
      Could not load: {message}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getCategoryPage,
  listReleases,
  type CategoryPage as CategoryPageDoc,
  type Release,
  type Post,
} from '../api/storefront';
import { FullHero } from '../components/category/FullHero';
import { HalfHero } from '../components/category/HalfHero';
import { ReleaseCard } from '../components/ReleaseCard';
import { PostCard } from '../components/PostCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Editable } from '../admin/Editable';

const GRID_LIMIT = 48;

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<CategoryPageDoc | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNews = page?.kind === 'NEWS_CATEGORY';

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    setLoading(true);
    setError(null);
    setNotFound(false);

    // Fetch page metadata; releases (product pages) can be fetched once we
    // know whether there is a format filter. News-category pages already
    // carry their posts embedded on the resolver response.
    getCategoryPage(slug)
      .then(async (p) => {
        if (cancelled) return;
        if (!p) {
          setNotFound(true);
          setPage(null);
          setReleases([]);
          setPosts([]);
          return;
        }
        setPage(p);
        if (p.kind === 'NEWS_CATEGORY') {
          setPosts(p.posts ?? []);
          setReleases([]);
          return;
        }
        try {
          const list = await listReleases({
            format: p.formatFilter ?? undefined,
            limit: GRID_LIMIT,
          });
          if (!cancelled) setReleases(list);
        } catch (e) {
          if (!cancelled) setError((e as Error)?.message ?? 'Failed to load releases');
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e?.message ?? 'Failed to load page');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <LoadingSkeleton count={1} height={480} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
          <LoadingSkeleton count={8} height={260} />
        </div>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-24 text-center">
        <div className="text-[13px] uppercase tracking-[0.14em]" style={{ color: 'var(--mute)' }}>
          Page not found
        </div>
        <h1
          className="text-[28px] mt-3 font-semibold"
          style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}
        >
          We couldn't find that category.
        </h1>
      </div>
    );
  }

  return (
    <>
      {page.template === 'HALF_HERO' ? <HalfHero page={page} /> : <FullHero page={page} />}

      <section id="featured" className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="flex items-baseline justify-between mb-6">
          <Editable
            entity="categoryPage"
            id={page.id}
            field="title"
            value={page.title}
            as="h2"
            className="text-[22px] md:text-[26px] font-semibold text-[color:var(--ink)] tracking-[-0.03em]"
            placeholder="Section title"
          />
          <div className="text-[12px] mono" style={{ color: 'var(--mute)' }}>
            {isNews
              ? `${posts.length} post${posts.length === 1 ? '' : 's'}`
              : `${releases.length} record${releases.length === 1 ? '' : 's'}`}
          </div>
        </div>

        {isNews ? (
          posts.length === 0 ? (
            <div
              className="text-center text-[13px] py-16 rcard"
              style={{ color: 'var(--mute)' }}
            >
              No posts in this category yet.
            </div>
          ) : (
            <div className="mf-news-grid">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )
        ) : error ? (
          <div
            className="text-[13px] py-6 px-4 rcard"
            style={{ color: 'var(--danger)', background: 'var(--danger-t)' }}
          >
            Could not load records: {error}
          </div>
        ) : releases.length === 0 ? (
          <div
            className="text-center text-[13px] py-16 rcard"
            style={{ color: 'var(--mute)' }}
          >
            No records in this category just now — check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {releases.map((r) => (
              <ReleaseCard key={r.id} release={r} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

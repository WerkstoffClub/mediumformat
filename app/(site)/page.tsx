import Link from "next/link";
import {
  getCatalogProducts,
  countActiveProducts,
  getLatestNews,
} from "@/lib/catalog";
import { ReleaseCard } from "@/components/site/ReleaseCard";

export const dynamic = "force-dynamic";

const ArrowRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

export default async function HomePage() {
  const [products, activeCount, news] = await Promise.all([
    getCatalogProducts(20),
    countActiveProducts(),
    getLatestNews(3),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <p className="hero-eyebrow">New &amp; used · Vinyl · CD · Cassette</p>
        <h1 className="hero-h1">
          Records,
          <br />
          <em>carefully selected.</em>
        </h1>
        <div className="hero-meta">
          <span className="hero-count">
            <strong>{activeCount} titles</strong> in the shop
          </span>
          <span className="hero-sep" />
          <Link href="/shop" className="hero-cta">
            Browse the catalogue <ArrowRight />
          </Link>
        </div>
      </section>

      {/* Catalogue */}
      <div className="content">
        <div className="content-bar">
          <div className="result-count">
            <strong>{activeCount}</strong> releases
          </div>
          <Link href="/shop" className="hero-cta">
            View all <ArrowRight />
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="empty">
            No releases in the catalogue yet. Check back soon.
          </div>
        ) : (
          <div className="grid">
            {products.map((product) => (
              <ReleaseCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* News */}
      {news.length > 0 && (
        <section className="journal">
          <div className="sec-hdr">
            <h2 className="sec-h2">Latest from the News</h2>
            <Link href="/news" className="sec-link">
              View all <ArrowRight />
            </Link>
          </div>
          <div className="jgrid">
            {news.map((post) => (
              <Link key={post.id} href={`/news/${post.slug}`} className="jcard">
                <div className="jcover">
                  <div className="cover-art">
                    <div className="grooves" />
                  </div>
                </div>
                <div className="jbody">
                  <span className="jbadge">
                    <span className="dot" />
                    News
                  </span>
                  <div className="jtitle">{post.title}</div>
                  <div className="jmeta">
                    {post.publishedAt?.toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

import { Link } from 'react-router-dom';
import type { CategoryPage } from '../../api/storefront';

interface HalfHeroProps {
  page: CategoryPage;
}

/**
 * HALF_HERO template — editorial 50:50 split.
 *
 * Mirrors the `mockup-category-half-hero.html` reference:
 * a monochrome image occupies the left column, editorial copy stack
 * (kicker, oversized headline, sales copy, CTA + secondary link) on
 * the right. Stacks on mobile with image on top.
 */
export function HalfHero({ page }: HalfHeroProps) {
  const { kicker, headline, title, salesCopy, heroImageUrl, ctaLabel, ctaHref } = page;

  return (
    <section
      className="mf-cat-half-hero"
      data-template="HALF_HERO"
      aria-labelledby="mf-cat-half-hero-title"
    >
      <div className="mf-cat-half-hero-art">
        {heroImageUrl ? (
          <img src={heroImageUrl} alt="" loading="eager" />
        ) : (
          <div className="mf-cat-half-groove" aria-hidden>
            <span className="mf-cat-half-groove-tone" />
          </div>
        )}
      </div>
      <div className="mf-cat-half-hero-copy">
        <div className="mf-cat-half-hero-copy-inner">
          {kicker && <div className="mf-cat-half-hero-kicker">{kicker}</div>}
          <h1 id="mf-cat-half-hero-title" className="mf-cat-half-hero-h1">
            {headline || title}
          </h1>
          {salesCopy && <p className="mf-cat-half-hero-lede">{salesCopy}</p>}
          <div className="mf-cat-half-hero-actions">
            {ctaLabel && ctaHref && (
              <Link to={ctaHref} className="mf-cat-half-hero-cta">
                {ctaLabel}
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            )}
            <Link to="#featured" className="mf-cat-half-hero-secondary">
              See featured picks
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .mf-cat-half-hero {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: var(--surface);
          border-bottom: 1px solid var(--hairline);
          min-height: 60vh;
        }
        .mf-cat-half-hero-art {
          position: relative;
          overflow: hidden;
          background: var(--raised);
          border-right: 1px solid var(--hairline);
          min-height: 60vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .mf-cat-half-hero-art img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: grayscale(1) contrast(1.05);
        }
        .mf-cat-half-groove {
          position: relative;
          width: min(520px, 82%);
          aspect-ratio: 1;
          border-radius: 50%;
          background: repeating-radial-gradient(circle at 50% 50%, #000 0 5px, #191919 5px 10px);
          opacity: 0.6;
        }
        html[data-theme="light"] .mf-cat-half-groove {
          background: repeating-radial-gradient(circle at 50% 50%, #d8d8d8 0 5px, #fff 5px 10px);
          opacity: 0.85;
        }
        .mf-cat-half-groove::after {
          content: "";
          position: absolute;
          inset: 44%;
          border-radius: 50%;
          background: var(--accent);
          opacity: 0.75;
        }
        .mf-cat-half-groove-tone {
          position: absolute;
          top: 6%;
          right: 8%;
          width: 3px;
          height: 42%;
          background: linear-gradient(var(--mute), transparent);
          border-radius: 2px;
          transform: rotate(24deg);
          transform-origin: top center;
          opacity: 0.4;
        }
        .mf-cat-half-hero-copy {
          display: flex;
          align-items: center;
          padding: clamp(28px, 5vw, 72px) clamp(24px, 4vw, 56px);
        }
        .mf-cat-half-hero-copy-inner {
          max-width: 46ch;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .mf-cat-half-hero-kicker {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--mute);
        }
        .mf-cat-half-hero-h1 {
          font: 600 clamp(34px, 4.6vw, 56px)/1.05 "Geist", "Helvetica Neue", Arial, sans-serif;
          letter-spacing: -0.05em;
          color: var(--ink);
          margin: 0;
        }
        .mf-cat-half-hero-lede {
          font-size: clamp(14px, 1vw, 16px);
          line-height: 1.65;
          color: var(--body);
          margin: 0;
        }
        .mf-cat-half-hero-actions {
          display: flex;
          align-items: center;
          gap: 22px;
          flex-wrap: wrap;
          margin-top: 6px;
        }
        .mf-cat-half-hero-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
          padding: 12px 20px;
          border-radius: var(--r-pill);
          background: var(--accent);
          color: var(--accent-text);
          text-decoration: none;
          transition: transform .15s, gap .15s;
        }
        .mf-cat-half-hero-cta:hover {
          transform: translateY(-1px);
          gap: 12px;
        }
        .mf-cat-half-hero-secondary {
          font-size: 13px;
          font-weight: 500;
          color: var(--body);
          text-decoration: none;
          border-bottom: 1px solid var(--hairline);
          padding-bottom: 2px;
          transition: color .15s, border-color .15s;
        }
        .mf-cat-half-hero-secondary:hover {
          color: var(--ink);
          border-color: var(--ink);
        }
        @media (max-width: 900px) {
          .mf-cat-half-hero {
            grid-template-columns: 1fr;
            min-height: auto;
          }
          .mf-cat-half-hero-art {
            min-height: 50vh;
            border-right: none;
            border-bottom: 1px solid var(--hairline);
          }
          .mf-cat-half-hero-copy {
            padding: 40px 24px 48px;
          }
        }
      `}</style>
    </section>
  );
}

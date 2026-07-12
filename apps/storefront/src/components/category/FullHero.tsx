import { Link } from 'react-router-dom';
import type { CategoryPage } from '../../api/storefront';

interface FullHeroProps {
  page: CategoryPage;
}

/**
 * FULL_HERO template — cinematic full-bleed hero.
 *
 * Mirrors the `mockup-category-players.html` hero shape:
 * a large image (or vinyl-groove disc placeholder), gradient veil,
 * kicker + oversized headline + sales copy + CTA overlay-left.
 * Product grid renders as a sibling below in the parent page.
 */
export function FullHero({ page }: FullHeroProps) {
  const { kicker, headline, title, salesCopy, heroImageUrl, ctaLabel, ctaHref } = page;

  return (
    <section
      className="mf-cat-full-hero"
      data-template="FULL_HERO"
      aria-labelledby="mf-cat-full-hero-title"
    >
      <div className="mf-cat-full-hero-art">
        {heroImageUrl ? (
          <img src={heroImageUrl} alt="" loading="eager" />
        ) : (
          <div className="mf-cat-groove-disc" aria-hidden>
            <span className="mf-cat-groove-disc-tonearm" />
          </div>
        )}
      </div>
      <div className="mf-cat-full-hero-veil" aria-hidden />
      <div className="mf-cat-full-hero-content">
        {kicker && <span className="mf-cat-full-hero-kicker">{kicker}</span>}
        <h1 id="mf-cat-full-hero-title" className="mf-cat-full-hero-h1">
          {headline || title}
        </h1>
        {salesCopy && <p className="mf-cat-full-hero-copy">{salesCopy}</p>}
        {ctaLabel && ctaHref && (
          <Link to={ctaHref} className="mf-cat-full-hero-cta">
            {ctaLabel}
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>

      <style>{`
        .mf-cat-full-hero {
          position: relative;
          overflow: hidden;
          background: var(--canvas);
          border-bottom: 1px solid var(--hairline);
          height: min(78vh, 720px);
          min-height: 520px;
          display: flex;
          align-items: center;
        }
        .mf-cat-full-hero-art {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .mf-cat-full-hero-art img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: grayscale(1) contrast(1.05);
        }
        .mf-cat-groove-disc {
          position: relative;
          width: min(640px, 78vw);
          height: min(640px, 78vw);
          border-radius: 50%;
          background: repeating-radial-gradient(circle at 50% 50%, #000 0 5px, #191919 5px 10px);
          opacity: 0.55;
        }
        html[data-theme="light"] .mf-cat-groove-disc {
          background: repeating-radial-gradient(circle at 50% 50%, #d8d8d8 0 5px, #fff 5px 10px);
          opacity: 0.85;
        }
        .mf-cat-groove-disc::after {
          content: "";
          position: absolute;
          inset: 44%;
          border-radius: 50%;
          background: var(--accent);
          opacity: 0.7;
        }
        .mf-cat-groove-disc-tonearm {
          position: absolute;
          top: 8%;
          right: 10%;
          width: 3px;
          height: 46%;
          background: linear-gradient(var(--mute), transparent);
          border-radius: 2px;
          transform: rotate(28deg);
          transform-origin: top center;
          opacity: 0.4;
        }
        .mf-cat-full-hero-veil {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,.15) 42%, rgba(0,0,0,.62) 100%);
          pointer-events: none;
        }
        html[data-theme="light"] .mf-cat-full-hero-veil {
          background: linear-gradient(180deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,.04) 42%, rgba(0,0,0,.35) 100%);
        }
        .mf-cat-full-hero-content {
          position: relative;
          z-index: 1;
          max-width: 640px;
          padding: 0 clamp(24px, 5vw, 72px);
          display: flex;
          flex-direction: column;
          gap: 16px;
          color: #fff;
        }
        .mf-cat-full-hero-kicker {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 6px 13px;
          border-radius: var(--r-pill);
          border: 1px solid rgba(255,255,255,.5);
          color: #fff;
          background: rgba(0,0,0,.25);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          width: fit-content;
        }
        .mf-cat-full-hero-h1 {
          font: 600 clamp(36px, 5.5vw, 60px)/1.05 "Noto Sans", sans-serif;
          letter-spacing: -0.05em;
          color: #fff;
          margin: 0;
          text-shadow: 0 2px 24px rgba(0,0,0,.4);
        }
        .mf-cat-full-hero-copy {
          font-size: clamp(14px, 1.1vw, 16px);
          line-height: 1.55;
          color: rgba(255,255,255,.86);
          max-width: 44ch;
          margin: 0;
        }
        .mf-cat-full-hero-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
          padding: 10px 18px;
          border-radius: var(--r-pill);
          background: #fff;
          color: #000;
          text-decoration: none;
          transition: transform .15s, gap .15s;
          width: fit-content;
          margin-top: 4px;
        }
        .mf-cat-full-hero-cta:hover {
          transform: translateY(-1px);
          gap: 12px;
        }
        @media (max-width: 720px) {
          .mf-cat-full-hero { min-height: 460px; height: 68vh; }
          .mf-cat-full-hero-content { max-width: 92vw; }
        }
      `}</style>
    </section>
  );
}

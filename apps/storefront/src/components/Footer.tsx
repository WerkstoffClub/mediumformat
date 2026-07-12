import { Link } from 'react-router-dom';
import { NewsletterSignup } from './NewsletterSignup';

/**
 * Footer per mockup-storefront: 4-column grid (Brand / Shop / News / Info),
 * newsletter row, legal + payment-method row.
 */
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mf-footer">
      <div className="fgrid">
        <div>
          <div className="fbrand-name">
            Medium Format<sup>®</sup>
          </div>
          <div className="ftagline">
            Independent record shop based in Jakarta, Indonesia. Curating the finest in
            vinyl, CD, and music culture since 2019.
          </div>
          <div className="floc">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Jl. Kemang Raya No. 15, Jakarta Selatan
          </div>
        </div>
        <FooterCol title="Shop">
          <FLink to="/catalog?sort=new">New Arrivals</FLink>
          <FLink to="/catalog?format=LP">Vinyl</FLink>
          <FLink to="/catalog?format=CD">CDs</FLink>
          <FLink to="/catalog?format=MERCH">Merch</FLink>
          <FLink to="/pages/wholesale">Wholesale</FLink>
        </FooterCol>
        <FooterCol title="News">
          <FLink to="/news?category=staff%20picks">Staff Picks</FLink>
          <FLink to="/news?category=review">Reviews</FLink>
          <FLink to="/news?category=feature">Features</FLink>
          <FLink to="/news?category=events">Events</FLink>
        </FooterCol>
        <FooterCol title="Info">
          <FLink to="/pages/about">About Us</FLink>
          <FLink to="/pages/shipping">Shipping &amp; Returns</FLink>
          <FLink to="/pages/sell">Sell Your Records</FLink>
          <FLink to="/pages/contact">Contact</FLink>
          <a
            href="https://instagram.com/mediumformat"
            className="flink"
            rel="noopener noreferrer"
            target="_blank"
          >
            Instagram
          </a>
        </FooterCol>
      </div>

      {/* Newsletter row */}
      <div className="fnewsletter">
        <div>
          <div className="fnewsletter-title">New arrivals, in your inbox</div>
          <div className="fnewsletter-sub">
            One email a week. Restocks, preorders, and a short note from the shop.
          </div>
        </div>
        <NewsletterSignup compact />
      </div>

      <div className="fbot">
        <div className="flegal">© {year} Medium Format</div>
        <PayLogos />
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="fcol-h">{title}</div>
      <div className="flinks">{children}</div>
    </div>
  );
}

function FLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="flink">
      {children}
    </Link>
  );
}

function PayLogos() {
  return (
    <div className="pay-logos" aria-label="Accepted payment methods">
      <svg viewBox="0 0 44 18" role="img" aria-label="Visa"><text x="0" y="14" fontFamily="Geist, sans-serif" fontWeight="700" fontSize="15" fill="currentColor" letterSpacing="-.5" fontStyle="italic">VISA</text></svg>
      <svg viewBox="0 0 30 18" role="img" aria-label="Mastercard"><circle cx="11" cy="9" r="6.5" fill="currentColor" opacity=".55" /><circle cx="19" cy="9" r="6.5" fill="currentColor" /></svg>
      <svg viewBox="0 0 34 18" role="img" aria-label="JCB"><text x="0" y="14" fontFamily="Geist, sans-serif" fontWeight="700" fontSize="14" fill="currentColor" letterSpacing="-.3">JCB</text></svg>
      <svg viewBox="0 0 40 18" role="img" aria-label="QRIS"><text x="0" y="14" fontFamily="Geist, sans-serif" fontWeight="700" fontSize="13" fill="currentColor">QRIS</text></svg>
      <svg viewBox="0 0 48 18" role="img" aria-label="GoPay"><text x="0" y="14" fontFamily="Geist, sans-serif" fontWeight="700" fontSize="13" fill="currentColor" letterSpacing="-.3">GoPay</text></svg>
      <svg viewBox="0 0 34 18" role="img" aria-label="OVO"><text x="0" y="14" fontFamily="Geist, sans-serif" fontWeight="700" fontSize="13" fill="currentColor">OVO</text></svg>
      <svg viewBox="0 0 42 18" role="img" aria-label="DANA"><text x="0" y="14" fontFamily="Geist, sans-serif" fontWeight="700" fontSize="13" fill="currentColor" letterSpacing="-.2">DANA</text></svg>
      <svg viewBox="0 0 74 18" role="img" aria-label="ShopeePay"><text x="0" y="14" fontFamily="Geist, sans-serif" fontWeight="700" fontSize="13" fill="currentColor" letterSpacing="-.3">ShopeePay</text></svg>
      <svg viewBox="0 0 34 18" role="img" aria-label="BCA"><text x="0" y="14" fontFamily="Geist, sans-serif" fontWeight="700" fontSize="13" fill="currentColor" letterSpacing="-.2">BCA</text></svg>
    </div>
  );
}

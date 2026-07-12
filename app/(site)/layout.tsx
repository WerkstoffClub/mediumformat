import Link from "next/link";
import { cartCount } from "@/lib/cart";
import "./storefront.css";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const count = await cartCount();

  return (
    <div className="mf" data-theme="dark">
      {/* Announcement */}
      <div className="announce">
        Free shipping on orders over <strong>Rp&nbsp;500.000</strong> within Jakarta —{" "}
        <Link href="/shop">New arrivals just landed</Link>
      </div>

      {/* Nav */}
      <nav className="nav">
        <Link href="/" className="nav-logo">
          MEDIUM·FORMAT
        </Link>
        <div className="nav-menu">
          <div className="menu-item">
            <Link className="nav-link" href="/shop">
              Shop <span className="chev">▾</span>
            </Link>
            <div className="mega">
              <div className="mega-links">
                <Link href="/shop">New Releases</Link>
                <Link href="/shop">Best Selling</Link>
                <Link href="/shop">Pre-Orders</Link>
                <Link href="/shop">On Sale</Link>
              </div>
              <Link className="mega-hero" href="/shop">
                <span className="mh-eyebrow">New this week</span>
                <span className="mh-title">Fresh titles just landed</span>
              </Link>
            </div>
          </div>
          <div className="menu-item">
            <Link className="nav-link" href="/shop">
              Formats <span className="chev">▾</span>
            </Link>
            <div className="mega">
              <div className="mega-links grid">
                <Link href="/shop">Vinyl</Link>
                <Link href="/shop">Cassettes</Link>
                <Link href="/shop">CD</Link>
                <Link href="/shop">Books</Link>
                <Link href="/shop">Prints</Link>
                <Link href="/shop">Merch</Link>
              </div>
              <Link className="mega-hero" href="/shop">
                <span className="mh-eyebrow">All formats</span>
                <span className="mh-title">Vinyl, CD, cassette &amp; more</span>
              </Link>
            </div>
          </div>
          <div className="menu-item">
            <Link className="nav-link" href="/news">
              News <span className="chev">▾</span>
            </Link>
            <div className="mega">
              <div className="mega-links">
                <Link href="/news">Reviews</Link>
                <Link href="/news">Staff Picks</Link>
                <Link href="/news">New Arrivals</Link>
                <Link href="/news">Features</Link>
              </div>
              <Link className="mega-hero" href="/news">
                <span className="mh-eyebrow">Latest story</span>
                <span className="mh-title">From the Medium Format desk</span>
              </Link>
            </div>
          </div>
          <div className="menu-item">
            <Link className="nav-link" href="/wholesale">
              Wholesale
            </Link>
          </div>
        </div>
        <div className="nav-actions">
          <Link href="/shop" className="nav-btn" aria-label="Search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </Link>
          <Link href="/account" className="nav-btn" aria-label="Account">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Link>
          <div className="cart-wrap">
            <Link href="/cart" className="nav-btn" aria-label={`Cart, ${count} items`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" />
              </svg>
            </Link>
            {count > 0 && <span className="cart-badge">{count}</span>}
          </div>
        </div>
      </nav>

      <main>{children}</main>

      {/* Footer */}
      <footer>
        <div className="fgrid">
          <div>
            <div className="fbrand-name">MEDIUM·FORMAT</div>
            <div className="ftagline">
              Independent record shop based in Jakarta, Indonesia. Curating the finest
              in vinyl, CD, and music culture.
            </div>
            <div className="floc">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Jakarta, Indonesia
            </div>
          </div>
          <div>
            <div className="fcol-h">Shop</div>
            <div className="flinks">
              <Link href="/shop" className="flink">New Arrivals</Link>
              <Link href="/shop" className="flink">Vinyl</Link>
              <Link href="/shop" className="flink">CDs</Link>
              <Link href="/wholesale" className="flink">Wholesale</Link>
            </div>
          </div>
          <div>
            <div className="fcol-h">News</div>
            <div className="flinks">
              <Link href="/news" className="flink">Staff Picks</Link>
              <Link href="/news" className="flink">Reviews</Link>
              <Link href="/news" className="flink">Features</Link>
            </div>
          </div>
          <div>
            <div className="fcol-h">Info</div>
            <div className="flinks">
              <Link href="/about" className="flink">About Us</Link>
              <Link href="/shipping" className="flink">Shipping &amp; Returns</Link>
              <Link href="/account" className="flink">Account</Link>
              <Link href="/contact" className="flink">Contact</Link>
            </div>
          </div>
        </div>
        <div className="fbot">
          <div className="flegal">© 2026 Medium Format · Jakarta, Indonesia</div>
        </div>
      </footer>
    </div>
  );
}

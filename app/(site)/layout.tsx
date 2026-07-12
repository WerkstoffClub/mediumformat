import Link from "next/link";
import { cartCount } from "@/lib/cart";
import { CurrencySwitch } from "@/components/site/CurrencySwitch";
import { SearchOverlay } from "@/components/site/SearchOverlay";
import "./storefront.css";

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

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
        <Link href="/" className="nav-logo" aria-label="Medium Format — home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/MF_Logo/SVG/MF_Lockup_White.svg"
            alt="Medium Format"
            className="brand-wordmark"
          />
        </Link>

        <div className="nav-menu">
          <div className="menu-item">
            <Link className="nav-link" href="/shop">
              Shop <span className="chev">▾</span>
            </Link>
            <div className="mega">
              <div className="mega-links">
                <Link href="/shop?sort=new">New Releases</Link>
                <Link href="/shop">Best Selling</Link>
                <Link href="/shop">Pre-Orders</Link>
                <Link href="/shop">On Sale</Link>
              </div>
              <Link className="mega-hero" href="/shop">
                <span className="mh-art" />
                <span className="mh-eyebrow">New this week</span>
                <span className="mh-title">Fresh titles just landed</span>
                <span className="mh-cta">
                  Shop new arrivals <Arrow />
                </span>
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
                <span className="mh-art" />
                <span className="mh-eyebrow">All formats</span>
                <span className="mh-title">Vinyl, CD, cassette &amp; more</span>
                <span className="mh-cta">
                  Browse all formats <Arrow />
                </span>
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
                <span className="mh-art" />
                <span className="mh-eyebrow">Latest story</span>
                <span className="mh-title">From the Medium Format desk</span>
                <span className="mh-cta">
                  Read the news <Arrow />
                </span>
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
          <SearchOverlay />
          <Link href="/account" className="nav-btn" aria-label="Wishlist">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
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
          <CurrencySwitch />
        </div>
      </nav>

      <main>{children}</main>

      {/* Footer */}
      <footer>
        <div className="fgrid">
          <div>
            <div className="fbrand-name">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/MF_Logo/SVG/MF_Lockup_White.svg"
                alt="Medium Format"
                className="brand-wordmark"
              />
            </div>
            <div className="ftagline">
              Independent record shop based in Jakarta, Indonesia. Curating the finest
              in vinyl, CD, and music culture since 2019.
            </div>
            <div className="floc">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Jl. Kemang Raya No. 15, Jakarta Selatan
            </div>
          </div>
          <div>
            <div className="fcol-h">Shop</div>
            <div className="flinks">
              <Link href="/shop" className="flink">New Arrivals</Link>
              <Link href="/shop" className="flink">Vinyl</Link>
              <Link href="/shop" className="flink">CDs</Link>
              <Link href="/shop" className="flink">Merch</Link>
              <Link href="/wholesale" className="flink">Wholesale</Link>
            </div>
          </div>
          <div>
            <div className="fcol-h">News</div>
            <div className="flinks">
              <Link href="/news" className="flink">Staff Picks</Link>
              <Link href="/news" className="flink">Reviews</Link>
              <Link href="/news" className="flink">Features</Link>
              <Link href="/news" className="flink">Events</Link>
            </div>
          </div>
          <div>
            <div className="fcol-h">Info</div>
            <div className="flinks">
              <Link href="/about" className="flink">About Us</Link>
              <Link href="/shipping" className="flink">Shipping &amp; Returns</Link>
              <Link href="/account" className="flink">Sell Your Records</Link>
              <Link href="/contact" className="flink">Contact</Link>
              <Link href="/account" className="flink">Account</Link>
            </div>
          </div>
        </div>
        <div className="fbot">
          <div className="flegal">© 2026 Medium Format</div>
          <div className="pay-logos">
            <svg viewBox="0 0 44 18" role="img" aria-label="Visa">
              <text x="0" y="14" fontFamily="var(--ui)" fontWeight="700" fontSize="15" fill="currentColor" letterSpacing="-.5" fontStyle="italic">VISA</text>
            </svg>
            <svg viewBox="0 0 30 18" role="img" aria-label="Mastercard">
              <circle cx="11" cy="9" r="6.5" fill="currentColor" opacity=".55" />
              <circle cx="19" cy="9" r="6.5" fill="currentColor" />
            </svg>
            <svg viewBox="0 0 40 18" role="img" aria-label="QRIS">
              <text x="0" y="14" fontFamily="var(--ui)" fontWeight="700" fontSize="13" fill="currentColor">QRIS</text>
            </svg>
            <svg viewBox="0 0 48 18" role="img" aria-label="GoPay">
              <text x="0" y="14" fontFamily="var(--ui)" fontWeight="700" fontSize="13" fill="currentColor" letterSpacing="-.3">GoPay</text>
            </svg>
            <svg viewBox="0 0 34 18" role="img" aria-label="OVO">
              <text x="0" y="14" fontFamily="var(--ui)" fontWeight="700" fontSize="13" fill="currentColor">OVO</text>
            </svg>
            <svg viewBox="0 0 42 18" role="img" aria-label="DANA">
              <text x="0" y="14" fontFamily="var(--ui)" fontWeight="700" fontSize="13" fill="currentColor" letterSpacing="-.2">DANA</text>
            </svg>
            <svg viewBox="0 0 74 18" role="img" aria-label="ShopeePay">
              <text x="0" y="14" fontFamily="var(--ui)" fontWeight="700" fontSize="13" fill="currentColor" letterSpacing="-.3">ShopeePay</text>
            </svg>
            <svg viewBox="0 0 34 18" role="img" aria-label="BCA">
              <text x="0" y="14" fontFamily="var(--ui)" fontWeight="700" fontSize="13" fill="currentColor" letterSpacing="-.2">BCA</text>
            </svg>
          </div>
        </div>
      </footer>
    </div>
  );
}

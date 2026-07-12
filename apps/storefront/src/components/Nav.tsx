import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

type MenuKey = 'shop' | 'news' | null;

interface MegaLink {
  label: string;
  to: string;
}

interface MegaConfig {
  key: Exclude<MenuKey, null>;
  triggerLabel: string;
  /** The trigger link itself points here if the user clicks the label. */
  triggerTo: string;
  links: MegaLink[];
  hero: {
    eyebrow: string;
    title: string;
    ctaLabel: string;
    ctaTo: string;
  };
}

const SHOP_MENU: MegaConfig = {
  key: 'shop',
  triggerLabel: 'Shop',
  triggerTo: '/catalog',
  links: [
    { label: 'All records', to: '/catalog' },
    { label: 'LPs', to: '/catalog?format=LP' },
    { label: '7" singles', to: '/catalog?format=SEVEN_INCH' },
    { label: '12" singles', to: '/catalog?format=TWELVE_INCH' },
    { label: 'CDs', to: '/catalog?format=CD' },
    { label: 'Cassettes', to: '/catalog?format=CASSETTE' },
    { label: 'Merch', to: '/catalog?format=MERCH' },
  ],
  hero: {
    eyebrow: 'New this week',
    title: 'Fresh arrivals just landed',
    ctaLabel: 'Shop new arrivals',
    ctaTo: '/catalog',
  },
};

const NEWS_MENU: MegaConfig = {
  key: 'news',
  triggerLabel: 'News',
  triggerTo: '/news',
  links: [
    { label: 'All posts', to: '/news' },
    { label: 'Staff Picks', to: '/news?category=staff%20picks' },
    { label: 'Highlights', to: '/news?category=highlights' },
    { label: 'News', to: '/news?category=news' },
    { label: 'Interviews', to: '/news?category=interview' },
  ],
  hero: {
    eyebrow: 'Latest story',
    title: 'Reviews and staff picks from Jakarta',
    ctaLabel: 'Read the news',
    ctaTo: '/news',
  },
};

export function Nav() {
  const { theme, toggle } = useTheme();
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const closeTimer = useRef<number | null>(null);

  // Close all menus on route change.
  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  // Close search overlay on Escape.
  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  // Delay mega-menu close so users can slide the pointer down onto the panel.
  const scheduleClose = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenMenu(null), 120);
  }, []);
  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openViaEnter = (key: Exclude<MenuKey, null>) => () => {
    cancelClose();
    setOpenMenu(key);
  };

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQ.trim();
    setSearchOpen(false);
    setSearchQ('');
    navigate(q ? `/catalog?q=${encodeURIComponent(q)}` : '/catalog');
  }

  return (
    <>
      <nav className="mf-nav" aria-label="Primary">
        {/* Left: logo */}
        <div className="mf-nav-left">
          <button
            type="button"
            className="mf-hamburger"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              {mobileOpen ? (
                <>
                  <path d="M6 6l12 12" />
                  <path d="M18 6l-12 12" />
                </>
              ) : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </>
              )}
            </svg>
          </button>
          <Link to="/" className="mf-nav-logo" aria-label="Medium Format — Home">
            <span className="mf-nav-logo-word">Medium Format</span>
            <span className="mf-nav-logo-r" aria-hidden>®</span>
          </Link>
        </div>

        {/* Center: menu */}
        <div className="mf-nav-menu">
          <MegaMenuItem
            cfg={SHOP_MENU}
            openMenu={openMenu}
            onEnter={openViaEnter('shop')}
            onLeave={scheduleClose}
          />
          <NavItem to="/preorders">Preorders</NavItem>
          <MegaMenuItem
            cfg={NEWS_MENU}
            openMenu={openMenu}
            onEnter={openViaEnter('news')}
            onLeave={scheduleClose}
          />
          <NavItem to="/about">About</NavItem>
        </div>

        {/* Right: actions */}
        <div className="mf-nav-actions">
          <button
            type="button"
            className="mf-icon-btn"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="mf-icon-btn"
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="mf-icon-btn relative"
            aria-label="Cart (0 items) — checkout coming soon"
            title="Checkout coming soon"
            disabled
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 6h15l-1.5 9h-13z" />
              <circle cx="9" cy="20" r="1.5" />
              <circle cx="18" cy="20" r="1.5" />
              <path d="M6 6L4 2H1" />
            </svg>
            <span className="mf-cart-badge mono" aria-hidden>0</span>
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="mf-mobile-drawer" role="dialog" aria-label="Mobile menu">
          <MobileGroup label="Shop">
            {SHOP_MENU.links.map((l) => (
              <Link key={l.to} to={l.to} className="mf-mobile-link">{l.label}</Link>
            ))}
          </MobileGroup>
          <Link to="/preorders" className="mf-mobile-link mf-mobile-solo">Preorders</Link>
          <MobileGroup label="News">
            {NEWS_MENU.links.map((l) => (
              <Link key={l.to} to={l.to} className="mf-mobile-link">{l.label}</Link>
            ))}
          </MobileGroup>
          <Link to="/about" className="mf-mobile-link mf-mobile-solo">About</Link>
        </div>
      )}

      {/* Search overlay */}
      {searchOpen && (
        <div
          className="mf-search-ov"
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSearchOpen(false);
          }}
        >
          <form className="mf-sbox" onSubmit={submitSearch}>
            <div className="mf-srow">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                autoFocus
                type="search"
                className="mf-sinput"
                placeholder="Search artists, titles, catalog numbers…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
              <button
                type="button"
                className="mf-icon-btn"
                aria-label="Close search"
                onClick={() => setSearchOpen(false)}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12" />
                  <path d="M18 6l-12 12" />
                </svg>
              </button>
            </div>
            <div className="mf-shint">
              Press <span className="mf-kbd">Enter</span> to search, <span className="mf-kbd">Esc</span> to close
            </div>
          </form>
        </div>
      )}

      <style>{`
        .mf-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          height: var(--nav-h);
          background: var(--surface);
          border-bottom: 1px solid var(--hairline);
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          padding: 0 24px;
        }
        .mf-nav-left {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-self: start;
        }
        .mf-nav-logo {
          display: inline-flex;
          align-items: baseline;
          gap: 1px;
          color: var(--ink);
          text-decoration: none;
        }
        .mf-nav-logo-word {
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.04em;
        }
        .mf-nav-logo-r {
          font-size: 8px;
          font-weight: 500;
          position: relative;
          top: -0.4em;
          margin-left: 1px;
        }
        .mf-nav-menu {
          display: flex;
          align-items: center;
          gap: 4px;
          justify-self: center;
        }
        .mf-nav-actions {
          display: flex;
          align-items: center;
          gap: 2px;
          justify-self: end;
        }
        .mf-hamburger {
          display: none;
          width: 38px; height: 38px;
          align-items: center; justify-content: center;
          border: none; background: transparent;
          color: var(--body); cursor: pointer;
          border-radius: var(--r-md);
          transition: background .15s, color .15s;
        }
        .mf-hamburger:hover { background: var(--raised); color: var(--ink); }

        /* Menu items */
        .mf-menu-item {
          position: relative;
        }
        /* Bridge the small gap between trigger and mega panel so hover doesn't drop. */
        .mf-menu-item::after {
          content: "";
          position: absolute;
          left: 0; right: 0;
          top: 100%;
          height: 12px;
        }
        .mf-nav-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font: 500 13px/1 "Noto Sans", sans-serif;
          color: var(--body);
          text-decoration: none;
          padding: 8px 12px;
          border-radius: var(--r-md);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: color .15s, background .15s;
        }
        .mf-nav-link:hover, .mf-nav-link.on {
          color: var(--ink);
          background: var(--raised);
        }
        .mf-nav-link .mf-chev {
          font-size: 9px;
          opacity: 0.7;
        }

        /* Mega panel */
        .mf-mega {
          position: absolute;
          top: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%) translateY(4px);
          display: flex;
          width: 560px;
          background: var(--surface);
          border: 1px solid var(--hairline);
          border-radius: var(--r-lg);
          box-shadow: var(--e2);
          overflow: hidden;
          opacity: 0;
          visibility: hidden;
          transition: opacity .15s, transform .15s;
          z-index: 120;
        }
        .mf-mega.open {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(0);
        }
        .mf-mega-links {
          flex: 1;
          padding: 10px;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .mf-mega-link {
          display: block;
          padding: 8px 12px;
          border-radius: var(--r-pill);
          font-size: 13px;
          line-height: 1.3;
          color: var(--body);
          text-decoration: none;
          transition: background .12s, color .12s;
        }
        .mf-mega-link:hover {
          background: var(--accent);
          color: var(--accent-text);
        }
        .mf-mega-hero {
          width: 220px;
          flex-shrink: 0;
          background: var(--raised);
          border-left: 1px solid var(--hairline);
          padding: 16px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          gap: 6px;
          text-decoration: none;
          position: relative;
          overflow: hidden;
          transition: background .15s;
        }
        .mf-mega-hero:hover { background: var(--canvas); }
        .mf-mega-hero .mh-art {
          position: absolute;
          top: 14px; right: 14px;
          width: 56px; height: 56px;
          border-radius: 50%;
          background: repeating-radial-gradient(circle at 50% 50%, var(--hairline) 0 3px, transparent 3px 6px);
          opacity: 0.6;
        }
        html[data-theme="light"] .mf-mega-hero .mh-art {
          background: repeating-radial-gradient(circle at 50% 50%, #00000022 0 3px, transparent 3px 6px);
        }
        .mf-mega-hero .mh-eyebrow {
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--mute);
        }
        .mf-mega-hero .mh-title {
          font-size: 15px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: var(--ink);
          line-height: 1.3;
        }
        .mf-mega-hero .mh-cta {
          font-size: 12px;
          font-weight: 500;
          color: var(--ink);
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
        }
        .mf-mega-hero .mh-cta svg {
          width: 12px; height: 12px;
          transition: transform .15s;
        }
        .mf-mega-hero:hover .mh-cta svg { transform: translateX(3px); }

        /* Icon buttons */
        .mf-icon-btn {
          width: 38px; height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: var(--body);
          border-radius: var(--r-md);
          cursor: pointer;
          position: relative;
          transition: background .15s, color .15s;
        }
        .mf-icon-btn:hover { background: var(--raised); color: var(--ink); }
        .mf-icon-btn:disabled { cursor: not-allowed; }
        .mf-cart-badge {
          position: absolute;
          top: 4px; right: 4px;
          min-width: 15px; height: 15px;
          padding: 0 3px;
          border-radius: var(--r-pill);
          background: var(--accent);
          color: var(--accent-text);
          font-size: 9px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Mobile drawer */
        .mf-mobile-drawer {
          position: sticky;
          top: var(--nav-h);
          z-index: 90;
          background: var(--surface);
          border-bottom: 1px solid var(--hairline);
          padding: 12px 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .mf-mobile-group-label {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--mute);
          padding: 12px 10px 6px;
        }
        .mf-mobile-link {
          display: block;
          padding: 10px 12px;
          border-radius: var(--r-md);
          font-size: 14px;
          color: var(--body);
          text-decoration: none;
          transition: background .15s, color .15s;
        }
        .mf-mobile-link:hover, .mf-mobile-link:focus-visible {
          background: var(--raised);
          color: var(--ink);
        }
        .mf-mobile-solo {
          padding-top: 12px;
          padding-bottom: 12px;
          font-weight: 500;
          color: var(--ink);
          border-top: 1px solid var(--hairline);
          margin-top: 6px;
        }

        /* Search overlay */
        .mf-search-ov {
          position: fixed;
          inset: 0;
          z-index: 300;
          background: rgba(0,0,0,.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 88px;
          padding-left: 16px;
          padding-right: 16px;
        }
        html[data-theme="light"] .mf-search-ov {
          background: rgba(255,255,255,.6);
        }
        .mf-sbox {
          width: 100%;
          max-width: 580px;
          background: var(--surface);
          border: 1px solid var(--hairline);
          border-radius: var(--r-xl);
          overflow: hidden;
          box-shadow: var(--e3);
        }
        .mf-srow {
          display: flex;
          align-items: center;
          padding: 14px 16px;
          gap: 11px;
          border-bottom: 1px solid var(--hairline);
        }
        .mf-srow > svg { color: var(--mute); flex-shrink: 0; }
        .mf-sinput {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-size: 16px;
          font-family: "Noto Sans", sans-serif;
          color: var(--ink);
        }
        .mf-sinput::placeholder { color: var(--mute); }
        .mf-shint {
          font-size: 12px;
          color: var(--mute);
          padding: 12px 16px;
        }
        .mf-kbd {
          font-family: "Noto Sans Mono", ui-monospace, monospace;
          font-size: 10px;
          color: var(--mute);
          border: 1px solid var(--hairline);
          border-radius: var(--r-sm);
          padding: 2px 5px;
          margin: 0 2px;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .mf-nav-menu { display: none; }
          .mf-hamburger { display: inline-flex; }
          .mf-nav { grid-template-columns: auto 1fr auto; padding: 0 12px; }
          .mf-nav-actions { justify-self: end; }
        }
      `}</style>
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  const { pathname } = useLocation();
  const active = pathname === to || pathname.startsWith(`${to}/`);
  return (
    <div className="mf-menu-item">
      <Link to={to} className={active ? 'mf-nav-link on' : 'mf-nav-link'}>
        {children}
      </Link>
    </div>
  );
}

function MegaMenuItem({
  cfg,
  openMenu,
  onEnter,
  onLeave,
}: {
  cfg: MegaConfig;
  openMenu: MenuKey;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const open = openMenu === cfg.key;
  const { pathname } = useLocation();
  const active = pathname.startsWith(cfg.triggerTo);
  return (
    <div
      className="mf-menu-item"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
    >
      <Link
        to={cfg.triggerTo}
        className={active ? 'mf-nav-link on' : 'mf-nav-link'}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {cfg.triggerLabel}
        <span className="mf-chev" aria-hidden>▾</span>
      </Link>
      <div
        className={open ? 'mf-mega open' : 'mf-mega'}
        role="menu"
        aria-label={`${cfg.triggerLabel} submenu`}
      >
        <div className="mf-mega-links">
          {cfg.links.map((l) => (
            <Link key={l.to} to={l.to} className="mf-mega-link" role="menuitem">
              {l.label}
            </Link>
          ))}
        </div>
        <Link to={cfg.hero.ctaTo} className="mf-mega-hero" role="menuitem">
          <span className="mh-art" aria-hidden />
          <span className="mh-eyebrow">{cfg.hero.eyebrow}</span>
          <span className="mh-title">{cfg.hero.title}</span>
          <span className="mh-cta">
            {cfg.hero.ctaLabel}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </Link>
      </div>
    </div>
  );
}

function MobileGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mf-mobile-group-label">{label}</div>
      {children}
    </div>
  );
}

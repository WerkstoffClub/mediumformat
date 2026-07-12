import { NavLink, Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

const linkClass = ({ isActive }: { isActive: boolean }): string =>
  [
    'inline-flex items-center px-3 py-2 rounded-md text-[13px] font-medium transition-colors',
    isActive ? 'nav-link-active' : 'nav-link-idle',
  ].join(' ');

/**
 * Sticky top nav.
 * Left: text logo "Medium Format®" that returns to /.
 * Center: primary links.
 * Right: theme toggle + cart icon (non-functional, badge 0).
 */
export function Nav() {
  const { theme, toggle } = useTheme();
  return (
    <>
      <nav className="nav" aria-label="Primary">
        <div className="flex items-center">
          <Link
            to="/"
            className="inline-flex items-baseline gap-0.5"
            style={{ color: 'var(--ink)' }}
          >
            <span className="text-[18px] font-semibold tracking-[-0.04em]">Medium Format</span>
            <span
              className="text-[8px] font-medium relative"
              style={{ top: '-0.4em', marginLeft: 1 }}
              aria-hidden
            >
              ®
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-1 justify-self-center">
          <NavLink to="/catalog" className={linkClass}>Shop</NavLink>
          <NavLink to="/preorders" className={linkClass}>Preorders</NavLink>
          <NavLink to="/news" className={linkClass}>News</NavLink>
        </div>
        <div className="flex items-center gap-2 justify-self-end">
          <button
            type="button"
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="nav-icon-btn"
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
            className="nav-icon-btn relative"
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
            <span className="cart-badge mono" aria-hidden>0</span>
          </button>
        </div>
      </nav>
      <style>{`
        .nav-link-idle {
          color: var(--body);
        }
        .nav-link-idle:hover {
          color: var(--ink);
          background: var(--raised);
        }
        .nav-link-active {
          color: var(--ink);
          background: var(--raised);
        }
        .nav-icon-btn {
          width: 38px; height: 38px;
          display: inline-flex; align-items: center; justify-content: center;
          border: none; background: transparent; color: var(--body);
          border-radius: var(--r-md); cursor: pointer;
          transition: background .15s, color .15s;
        }
        .nav-icon-btn:hover { background: var(--raised); color: var(--ink); }
        .nav-icon-btn:disabled { cursor: not-allowed; }
        .cart-badge {
          position: absolute; top: 4px; right: 4px;
          min-width: 15px; height: 15px; padding: 0 3px;
          border-radius: var(--r-pill);
          background: var(--accent); color: var(--accent-text);
          font-size: 9px; font-weight: 600;
          display: flex; align-items: center; justify-content: center;
        }
      `}</style>
    </>
  );
}

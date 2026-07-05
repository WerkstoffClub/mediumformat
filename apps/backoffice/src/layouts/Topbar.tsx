import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getReleases } from '../api/inventory';
import { getSyncStatus } from '../api/finance';

const CRUMBS: Array<[RegExp, string]> = [
  [/^\/dashboard/, 'Dashboard'],
  [/^\/finance/, 'Finance'],
  [/^\/orders\/.+/, 'Order detail'],
  [/^\/orders/, 'Orders'],
  [/^\/inventory\/new/, 'Add release'],
  [/^\/inventory\/.+\/edit/, 'Edit release'],
  [/^\/inventory/, 'Inventory'],
  [/^\/customers/, 'Customers'],
  [/^\/channels/, 'Channels'],
  [/^\/purchase-orders/, 'Purchase orders'],
  [/^\/vouchers/, 'Vouchers'],
  [/^\/newsletter/, 'Newsletter'],
  [/^\/social/, 'Social Media'],
  [/^\/blog/, 'Blog'],
  [/^\/preferences/, 'Preferences'],
];

export function Topbar({ onOpenPalette, onOpenNav }: { onOpenPalette: () => void; onOpenNav: () => void }) {
  const { pathname } = useLocation();
  const [hasAlerts, setHasAlerts] = useState(false);

  useEffect(() => {
    Promise.all([
      getReleases({ lowStockOnly: true, limit: 1 }).then(r => r.total).catch(() => 0),
      getSyncStatus().then(s => s.entities.filter(e => e.status === 'error').length).catch(() => 0),
    ]).then(([low, errors]) => setHasAlerts(low + errors > 0));
  }, []);

  const crumb = CRUMBS.find(([pattern]) => pattern.test(pathname))?.[1] ?? 'Back-office';

  return (
    <header className="h-[60px] bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center px-5 max-md:px-3.5 gap-4 max-md:gap-2 flex-shrink-0 sticky top-0 z-30">
      <button
        onClick={onOpenNav}
        aria-label="Open menu"
        className="hidden max-md:flex w-9 h-9 rounded-[6px] items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]"
      >
        <svg viewBox="0 0 24 24" className="w-[19px] h-[19px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <span className="hidden max-md:flex items-center flex-1 min-w-0">
        <img src="/MF_Lockup_Black.svg" alt="Medium Format" className="h-[15px] w-auto dark:hidden" />
        <img src="/MF_Lockup_White.svg" alt="Medium Format" className="h-[15px] w-auto hidden dark:block" />
      </span>
      <nav className="flex max-md:hidden items-center gap-[7px] text-[12px] whitespace-nowrap" aria-label="Breadcrumb">
        <span className="text-[var(--text-muted)]">Medium Format</span>
        <span className="text-[var(--text-muted)]">/</span>
        <span className="text-[var(--text-primary)]">{crumb}</span>
      </nav>

      <button
        onClick={onOpenPalette}
        className="max-md:hidden flex items-center gap-[9px] bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[8px] px-3 py-[9px] flex-1 max-w-[480px] mx-auto text-left transition-colors hover:border-[var(--text-muted)]"
        aria-label="Open command palette"
      >
        <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] text-[var(--text-muted)] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span className="text-[13px] text-[var(--text-muted)] flex-1 truncate">Search orders, catalogue, customers…</span>
        <span className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border)] rounded px-1.5 py-px flex-shrink-0">⌘K</span>
      </button>

      <div className="flex items-center gap-2.5 max-md:gap-1 flex-shrink-0">
        <button
          onClick={onOpenPalette}
          aria-label="Search"
          className="hidden max-md:flex w-9 h-9 rounded-[6px] items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]"
        >
          <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
        <Link
          to="/dashboard"
          title={hasAlerts ? 'Items need your attention' : 'Notifications'}
          className="relative w-9 h-9 rounded-[6px] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Notifications"
        >
          <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          {hasAlerts && <span className="absolute top-2 right-2 w-[6px] h-[6px] rounded-full bg-[var(--danger)] border-[1.5px] border-[var(--bg-surface)]" />}
        </Link>
        <Link
          to="/inventory/new"
          className="max-md:hidden flex items-center gap-1.5 px-3.5 py-[9px] rounded-[6px] bg-[var(--accent)] text-[var(--accent-text)] text-[13px] font-semibold hover:opacity-[.88] transition-opacity whitespace-nowrap"
        >
          <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add release
        </Link>
      </div>
    </header>
  );
}

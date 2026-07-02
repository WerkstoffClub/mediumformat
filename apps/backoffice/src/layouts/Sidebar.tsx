import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { getOrders } from '../api/ops';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  count?: number | null;
  statusDot?: boolean;
}
interface NavGroup { label: string; items: NavItem[]; }

const ic = (paths: React.ReactNode) => (
  <svg viewBox="0 0 24 24" className="w-[17px] h-[17px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
);

const icons = {
  home:       ic(<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>),
  dashboard:  ic(<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>),
  finance:    ic(<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>),
  orders:     ic(<><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></>),
  inventory:  ic(<><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/></>),
  customers:  ic(<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>),
  channels:   ic(<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></>),
  po:         ic(<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></>),
  vouchers:   ic(<><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/></>),
  newsletter: ic(<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>),
  social:     ic(<><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>),
  blog:       ic(<><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></>),
  settings:   ic(<><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></>),
};

export function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [pendingOrders, setPendingOrders] = useState<number | null>(null);

  useEffect(() => {
    getOrders({ payment: 'Unpaid', limit: 1 }).then(r => setPendingOrders(r.total)).catch(() => {});
  }, []);

  const groups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { label: 'Home',      to: '/home',      icon: icons.home },
        { label: 'Dashboard', to: '/dashboard', icon: icons.dashboard },
        { label: 'Finance',   to: '/finance',   icon: icons.finance },
      ],
    },
    {
      label: 'Selling',
      items: [
        { label: 'Orders',    to: '/orders',    icon: icons.orders, count: pendingOrders },
        { label: 'Inventory', to: '/inventory', icon: icons.inventory },
        { label: 'Customers', to: '/customers', icon: icons.customers },
        { label: 'Channels',  to: '/channels',  icon: icons.channels, statusDot: true },
      ],
    },
    {
      label: 'Shop',
      items: [
        { label: 'Purchase orders', to: '/purchase-orders', icon: icons.po },
        { label: 'Vouchers',        to: '/vouchers',        icon: icons.vouchers },
      ],
    },
    {
      label: 'Marketing',
      items: [
        { label: 'Newsletter',   to: '/newsletter', icon: icons.newsletter },
        { label: 'Social Media', to: '/social',     icon: icons.social },
        { label: 'Blog',         to: '/blog',       icon: icons.blog },
      ],
    },
    {
      label: 'Config',
      items: [{ label: 'Preferences', to: '/preferences', icon: icons.settings }],
    },
  ];

  const initials = user?.name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) ?? 'MF';
  const isDark = theme === 'dark';

  return (
    <aside className="w-[232px] min-w-[232px] bg-[var(--bg-surface)] border-r border-[var(--border)] flex flex-col">
      <NavLink to="/home" className="flex items-center px-[18px] py-[18px]" aria-label="Medium Format — home">
        <img src="/MF_Lockup_Black.svg" alt="Medium Format" className="h-[17px] w-auto dark:hidden" />
        <img src="/MF_Lockup_White.svg" alt="Medium Format" className="h-[17px] w-auto hidden dark:block" />
      </NavLink>

      <nav className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-[2px]">
        {groups.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] px-3 pt-[14px] pb-1.5 first:pt-0.5">
              {group.label}
            </p>
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-[11px] px-3 py-2 rounded-[6px] text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'text-[var(--text-primary)] bg-[var(--bg-overlay)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]'
                  }`
                }
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.count != null && item.count > 0 && (
                  <span className="font-mono text-[11px] text-[var(--text-secondary)] bg-[var(--bg-overlay)] border border-[var(--border)] rounded-full px-2 py-px min-w-[22px] text-center">
                    {item.count}
                  </span>
                )}
                {item.statusDot && <span className="w-[7px] h-[7px] rounded-full bg-[var(--success)]" title="All channels online" />}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--border)] p-3">
        <div className="flex items-center gap-2.5 px-1.5 py-1.5">
          <div className="w-[34px] h-[34px] rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-[12px] font-semibold flex items-center justify-center flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[var(--text-primary)] leading-tight truncate">{user?.name ?? '—'}</p>
            <p className="text-[11px] text-[var(--text-muted)] leading-tight capitalize">{user?.role?.toLowerCase() ?? ''}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="flex items-center gap-2 w-full mt-2 px-2.5 py-2 bg-[var(--bg-overlay)] border border-[var(--border)] rounded-[6px] text-[12px] font-medium text-[var(--text-primary)]"
        >
          {isDark ? (
            <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth={1.6}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          )}
          <span className="capitalize">{theme}</span>
        </button>
      </div>
    </aside>
  );
}

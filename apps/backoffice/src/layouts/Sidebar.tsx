import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
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
  dashboard:  ic(<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>),
  sales:      ic(<><path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/></>),
  pos:        ic(<><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><path d="M8 14h4"/><circle cx="15.5" cy="16.5" r="1.5" fill="currentColor" stroke="none"/></>),
  settlements: ic(<><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></>),
  preorders:  ic(<><path d="M20 12v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8"/><rect x="2" y="7" width="20" height="5" rx="1"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></>),
  tags:       ic(<><path d="M20.59 13.41L13.42 20.58a2 2 0 01-2.83 0L2.41 12.4A2 2 0 012 11V4a2 2 0 012-2h7a2 2 0 011.41.59l8.18 8.18a2 2 0 010 2.83z"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"/></>),
  orders:     ic(<><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></>),
  inventory:  ic(<><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/></>),
  customers:  ic(<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>),
  channels:   ic(<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></>),
  po:         ic(<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></>),
  vouchers:   ic(<><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/></>),
  newsletter: ic(<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>),
  social:     ic(<><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>),
  cms:        ic(<><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></>),
  settings:   ic(<><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></>),
};

export function Sidebar({ open = false, onClose = () => {} }: { open?: boolean; onClose?: () => void }) {
  const { user, logout } = useAuth();
  const [pendingOrders, setPendingOrders] = useState<number | null>(null);

  useEffect(() => {
    getOrders({ payment: 'Unpaid', limit: 1 }).then(r => setPendingOrders(r.total)).catch(() => {});
  }, []);

  const groups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', to: '/dashboard', icon: icons.dashboard },
        { label: 'Sales',     to: '/sales',     icon: icons.sales },
      ],
    },
    {
      label: 'Selling',
      items: [
        { label: 'POS',             to: '/pos',             icon: icons.pos },
        { label: 'Orders',          to: '/orders',          icon: icons.orders, count: pendingOrders },
        { label: 'Purchase orders', to: '/purchase-orders', icon: icons.po },
        { label: 'Inventory',       to: '/inventory',       icon: icons.inventory },
        { label: 'Customers',       to: '/customers',       icon: icons.customers },
        { label: 'Channels',        to: '/channels',        icon: icons.channels, statusDot: true },
      ],
    },
    {
      label: 'Shop',
      items: [
        { label: 'Preorders', to: '/preorders', icon: icons.preorders },
        { label: 'Vouchers',  to: '/vouchers',  icon: icons.vouchers },
      ],
    },
    {
      label: 'Marketing',
      items: [
        { label: 'Newsletter',     to: '/newsletter',      icon: icons.newsletter },
        { label: 'Social Media',   to: '/social',          icon: icons.social },
        { label: 'CMS',            to: '/cms',             icon: icons.cms },
      ],
    },
    {
      label: 'Config',
      items: [{ label: 'Preferences', to: '/preferences', icon: icons.settings }],
    },
  ];

  const initials = user?.name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) ?? 'MF';

  return (
    <aside
      className={`w-[232px] min-w-[232px] bg-[var(--bg-surface)] border-r border-[var(--border)] flex flex-col
        max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:transition-transform max-md:duration-200
        ${open ? 'max-md:translate-x-0 max-md:shadow-[0_8px_24px_rgba(0,0,0,.7)]' : 'max-md:-translate-x-full'}`}
    >
      <NavLink to="/dashboard" onClick={onClose} className="flex items-center px-[18px] py-[18px]" aria-label="Medium Format — dashboard">
        <img src={`${import.meta.env.BASE_URL}MF_Lockup_Black.svg`} alt="Medium Format" className="h-[17px] w-auto dark:hidden" />
        <img src={`${import.meta.env.BASE_URL}MF_Lockup_White.svg`} alt="Medium Format" className="h-[17px] w-auto hidden dark:block" />
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
                onClick={onClose}
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
      </div>
    </aside>
  );
}

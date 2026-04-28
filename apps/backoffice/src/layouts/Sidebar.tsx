import { NavLink } from 'react-router-dom';

interface NavItem { label: string; to: string; icon: React.ReactNode; badge?: number; }
interface NavGroup { label?: string; items: NavItem[]; }

const icons = {
  dashboard:  <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  inventory:  <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/></svg>,
  orders:     <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  customers:  <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  vouchers:   <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/></svg>,
  newsletter: <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  po:         <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  blog:       <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  channels:   <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  settings:   <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>,
};

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard',       to: '/dashboard',       icon: icons.dashboard },
      { label: 'Inventory',       to: '/inventory',       icon: icons.inventory },
      { label: 'Orders',          to: '/orders',          icon: icons.orders,   badge: 0 },
      { label: 'Customers',       to: '/customers',       icon: icons.customers },
      { label: 'Vouchers',        to: '/vouchers',        icon: icons.vouchers },
      { label: 'Newsletter',      to: '/newsletter',      icon: icons.newsletter },
      { label: 'Purchase Orders', to: '/purchase-orders', icon: icons.po },
      { label: 'Blog',            to: '/blog',            icon: icons.blog },
    ],
  },
  {
    label: 'Config',
    items: [
      { label: 'Channels',    to: '/channels',    icon: icons.channels },
      { label: 'Preferences', to: '/preferences', icon: icons.settings },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="w-[186px] min-w-[186px] bg-[#0d0d0d] border-r border-[#1e1e1e] flex flex-col">
      <div className="px-[18px] py-4 text-[15px] font-black tracking-tight text-white border-b border-[#1e1e1e]">
        Medium<span className="text-[var(--brand)]">Format</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-[18px] pt-3 pb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#3a3a3a]">
                {group.label}
              </p>
            )}
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-[18px] py-[7px] text-[12.5px] border-l-2 transition-colors ${
                    isActive
                      ? 'text-white bg-[#181822] border-[var(--brand)]'
                      : 'text-[#555] border-transparent hover:text-[#ccc] hover:bg-[#141414]'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="ml-auto bg-[var(--danger)] text-white text-[9px] font-bold rounded-full px-1.5 py-px">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-[#1e1e1e] p-[14px]">
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#191919] border border-[#252525] rounded-md">
          <span className="w-2 h-2 rounded-full bg-[var(--success)] flex-shrink-0" />
          <span className="text-[11px] text-[#aaa] truncate">Medium Format · JKT</span>
        </div>
      </div>
    </aside>
  );
}

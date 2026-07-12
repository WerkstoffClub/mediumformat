import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from '../components/CommandPalette';

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => { setNavOpen(false); }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(open => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      {navOpen && <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setNavOpen(false)} aria-hidden="true" />}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar onOpenPalette={() => setPaletteOpen(true)} onOpenNav={() => setNavOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-[var(--bg-base)] p-6 max-md:p-4">
          <Outlet />
        </main>
      </div>
      {/* mobile: the primary action moves out of the header to a floating button.
          Hidden on POS routes since the register owns the bottom of the viewport
          with its own cart / charge action. */}
      {!pathname.startsWith('/pos') && (
        <Link
          to="/inventory/new"
          aria-label="Add release"
          className="hidden max-md:flex fixed bottom-5 right-5 z-40 w-[52px] h-[52px] rounded-full bg-[var(--accent)] text-[var(--accent-text)] items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,.45)]"
        >
          <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </Link>
      )}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

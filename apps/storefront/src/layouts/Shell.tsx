import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnnouncementBar } from '../components/AnnouncementBar';
import { Nav } from '../components/Nav';
import { Footer } from '../components/Footer';
import { NowPlayingBar } from '../components/NowPlayingBar';

/**
 * The chrome shared by every page: announcement bar, sticky nav, footer,
 * and the sticky Now-Playing bar at the bottom.
 */
export function Shell() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--canvas)' }}>
      <AnnouncementBar />
      <Nav />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <NowPlayingBar />
    </div>
  );
}

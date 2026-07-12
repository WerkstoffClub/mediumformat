import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Shell } from './layouts/Shell';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ReleaseDetail from './pages/ReleaseDetail';
import Preorders from './pages/Preorders';
import NewsList from './pages/NewsList';
import NewsDetail from './pages/NewsDetail';
import NotFound from './pages/NotFound';

// In production the app is served under /shop/. In dev, `pnpm dev` boots at /.
const BASENAME = import.meta.env.PROD ? '/shop' : '';

export default function App() {
  return (
    <BrowserRouter basename={BASENAME}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/releases/:slug" element={<ReleaseDetail />} />
          <Route path="/preorders" element={<Preorders />} />
          <Route path="/news" element={<NewsList />} />
          <Route path="/news/:slug" element={<NewsDetail />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

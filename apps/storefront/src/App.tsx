import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Shell } from './layouts/Shell';
import { CurrencyProvider } from './hooks/useCurrency';
import { AdminEditProvider } from './admin/AdminEditContext';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ReleaseDetail from './pages/ReleaseDetail';
import Preorders from './pages/Preorders';
import NewsList from './pages/NewsList';
import NewsDetail from './pages/NewsDetail';
import CategoryPage from './pages/CategoryPage';
import NotFound from './pages/NotFound';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderPlaced from './pages/OrderPlaced';
import { CartProvider } from './hooks/useCart';

// Storefront is served at the site root in both dev and prod. The static
// prototype has moved to /prototype/* on the VPS (see deploy/docker/Caddyfile).
export default function App() {
  return (
    <AdminEditProvider>
      <CurrencyProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Shell />}>
                <Route path="/" element={<Home />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/releases/:slug" element={<ReleaseDetail />} />
                <Route path="/preorders" element={<Preorders />} />
                <Route path="/news" element={<NewsList />} />
                <Route path="/news/:slug" element={<NewsDetail />} />
                <Route path="/pages/:slug" element={<CategoryPage />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order/:number" element={<OrderPlaced />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </CurrencyProvider>
    </AdminEditProvider>
  );
}

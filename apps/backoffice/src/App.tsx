import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AppShell } from './layouts/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { OrdersList } from './pages/orders/OrdersList';
import { OrderDetail } from './pages/orders/OrderDetail';
import { CustomersList } from './pages/customers/CustomersList';
import { PurchaseOrdersList } from './pages/purchase-orders/PurchaseOrdersList';
import { ImportsList } from './pages/imports/ImportsList';
import { NewImport } from './pages/imports/NewImport';
import { ImportDetail } from './pages/imports/ImportDetail';
import { Channels } from './pages/channels/Channels';
import { Vouchers } from './pages/vouchers/Vouchers';
import { Newsletter } from './pages/newsletter/Newsletter';
import { Preferences } from './pages/preferences/Preferences';
import { Preorders } from './pages/preorders/Preorders';
import { Sales } from './pages/sales/Sales';
import { Pos } from './pages/pos/Pos';
import { PosCheckout } from './pages/pos/PosCheckout';
import { PosLayout } from './pages/pos/PosLayout';
import { SocialMedia } from './pages/social/SocialMedia';
import { Inventory } from './pages/inventory/Inventory';
import { ReleaseForm } from './pages/inventory/ReleaseForm';
import { BlogList } from './pages/blog/BlogList';
import { PostForm } from './pages/blog/PostForm';
import { CategoryPagesList } from './pages/category-pages/CategoryPagesList';
import { CategoryPageForm } from './pages/category-pages/CategoryPageForm';

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-[var(--text-muted)]">
        Loading...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoutes />}>
          <Route path="/dashboard"          element={<Dashboard />} />
          <Route path="/sales"              element={<Sales />} />
          <Route path="/analytics"          element={<Navigate to="/sales" replace />} />
          <Route path="/finance"            element={<Navigate to="/sales" replace />} />
          <Route path="/settlements"        element={<Navigate to="/sales?tab=settlements" replace />} />
          <Route path="/preorders"          element={<Preorders />} />
          <Route path="/categories"         element={<Navigate to="/inventory?tab=categories" replace />} />
          <Route element={<PosLayout />}>
            <Route path="/pos"                element={<Pos />} />
            <Route path="/pos/checkout"       element={<PosCheckout />} />
          </Route>
          <Route path="/orders"             element={<OrdersList />} />
          <Route path="/orders/:id"         element={<OrderDetail />} />
          <Route path="/customers"          element={<CustomersList />} />
          <Route path="/purchase-orders"    element={<PurchaseOrdersList />} />
          <Route path="/imports"            element={<ImportsList />} />
          <Route path="/imports/new"        element={<NewImport />} />
          <Route path="/imports/:id"        element={<ImportDetail />} />
          <Route path="/channels"           element={<Channels />} />
          <Route path="/vouchers"           element={<Vouchers />} />
          <Route path="/newsletter"         element={<Newsletter />} />
          <Route path="/preferences"        element={<Preferences />} />
          <Route path="/social"             element={<SocialMedia />} />
          <Route path="/inventory"          element={<Inventory />} />
          <Route path="/inventory/new"      element={<ReleaseForm />} />
          <Route path="/inventory/:id/edit" element={<ReleaseForm />} />
          <Route path="/blog"                        element={<BlogList />} />
          <Route path="/blog/new"                    element={<PostForm />} />
          <Route path="/blog/:id/edit"               element={<PostForm />} />
          <Route path="/category-pages"              element={<CategoryPagesList />} />
          <Route path="/category-pages/new"          element={<CategoryPageForm />} />
          <Route path="/category-pages/:id/edit"     element={<CategoryPageForm />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

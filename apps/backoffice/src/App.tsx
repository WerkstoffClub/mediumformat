import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AppShell } from './layouts/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import { OrdersList } from './pages/orders/OrdersList';
import { OrderDetail } from './pages/orders/OrderDetail';
import { CustomersList } from './pages/customers/CustomersList';
import { PurchaseOrdersList } from './pages/purchase-orders/PurchaseOrdersList';
import { Channels } from './pages/channels/Channels';
import { Vouchers } from './pages/vouchers/Vouchers';
import { Newsletter } from './pages/newsletter/Newsletter';
import { Preferences } from './pages/preferences/Preferences';
import { Finance } from './pages/finance/Finance';
import { SocialMedia } from './pages/social/SocialMedia';
import { InventoryList } from './pages/inventory/InventoryList';
import { ReleaseForm } from './pages/inventory/ReleaseForm';
import { BlogList } from './pages/blog/BlogList';
import { PostForm } from './pages/blog/PostForm';

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
          <Route path="/home"               element={<Home />} />
          <Route path="/dashboard"          element={<Dashboard />} />
          <Route path="/orders"             element={<OrdersList />} />
          <Route path="/orders/:id"         element={<OrderDetail />} />
          <Route path="/customers"          element={<CustomersList />} />
          <Route path="/purchase-orders"    element={<PurchaseOrdersList />} />
          <Route path="/channels"           element={<Channels />} />
          <Route path="/vouchers"           element={<Vouchers />} />
          <Route path="/newsletter"         element={<Newsletter />} />
          <Route path="/preferences"        element={<Preferences />} />
          <Route path="/finance"            element={<Finance />} />
          <Route path="/social"             element={<SocialMedia />} />
          <Route path="/inventory"          element={<InventoryList />} />
          <Route path="/inventory/new"      element={<ReleaseForm />} />
          <Route path="/inventory/:id/edit" element={<ReleaseForm />} />
          <Route path="/blog"               element={<BlogList />} />
          <Route path="/blog/new"           element={<PostForm />} />
          <Route path="/blog/:id/edit"      element={<PostForm />} />
          <Route path="/" element={<Navigate to="/home" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </AuthProvider>
  );
}

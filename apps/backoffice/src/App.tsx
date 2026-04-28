import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AppShell } from './layouts/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { InventoryList } from './pages/inventory/InventoryList';
import { ReleaseForm } from './pages/inventory/ReleaseForm';

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
          <Route path="/dashboard"         element={<Dashboard />} />
          <Route path="/inventory"         element={<InventoryList />} />
          <Route path="/inventory/new"     element={<ReleaseForm />} />
          <Route path="/inventory/:id/edit" element={<ReleaseForm />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

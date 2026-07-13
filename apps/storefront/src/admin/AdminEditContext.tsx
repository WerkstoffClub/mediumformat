import {
  createContext, useContext, useEffect, useState, useCallback, type ReactNode,
} from 'react';
import axios from 'axios';
import {
  type AdminUser, isEditor, getToken, clearToken, login as apiLogin, fetchMe,
} from './adminAuth';

interface AdminEditValue {
  user: AdminUser | null;
  isAdmin: boolean;          // true only when a verified ADMIN/MANAGER session exists
  loading: boolean;          // initial session check in flight
  editMode: boolean;
  loginOpen: boolean;
  loginError: string | null;
  toggleEdit: () => void;
  setEditMode: (on: boolean) => void;
  openLogin: () => void;
  closeLogin: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AdminEditContext = createContext<AdminEditValue | null>(null);

export function AdminEditProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditModeState] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const isAdmin = isEditor(user?.role);

  // On mount: reuse an existing back-office session if the shared-origin token
  // belongs to an editor. Silent on failure — anonymous visitors see nothing.
  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    let cancelled = false;
    fetchMe()
      .then(me => { if (!cancelled) setUser(isEditor(me.role) ? me : null); })
      .catch((err: unknown) => {
        if (cancelled) return;
        setUser(null);
        // Only a genuine 401 means the shared token is invalid. A transient
        // failure (offline, 5xx, CORS) must NOT wipe mf-access-token — the
        // back-office shares that key, so clearing it would sign the admin out
        // of the back-office too.
        if (axios.isAxiosError(err) && err.response?.status === 401) clearToken();
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const setEditMode = useCallback((on: boolean) => setEditModeState(on && isAdmin), [isAdmin]);
  const toggleEdit = useCallback(() => setEditModeState(v => (isAdmin ? !v : false)), [isAdmin]);
  const openLogin = useCallback(() => { setLoginError(null); setLoginOpen(true); }, []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoginError(null);
    try {
      const me = await apiLogin(email, password);
      if (!isEditor(me.role)) {
        clearToken();
        setLoginError('That account cannot edit the storefront.');
        return;
      }
      setUser(me);
      setLoginOpen(false);
    } catch (err: unknown) {
      setLoginError(
        axios.isAxiosError(err) && err.response?.status === 401
          ? 'Incorrect email or password.'
          : 'Sign-in failed — please try again.',
      );
    }
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
    setEditModeState(false);
  }, []);

  // Discreet entry point for admins with no active session: Ctrl/Cmd+Shift+E.
  // When already an editor it toggles edit mode; otherwise it opens the login popover.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        if (isAdmin) setEditModeState(v => !v);
        else { setLoginError(null); setLoginOpen(true); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isAdmin]);

  return (
    <AdminEditContext.Provider value={{
      user, isAdmin, loading, editMode, loginOpen, loginError,
      toggleEdit, setEditMode, openLogin, closeLogin, signIn, signOut,
    }}>
      {children}
    </AdminEditContext.Provider>
  );
}

export function useAdminEdit(): AdminEditValue {
  const ctx = useContext(AdminEditContext);
  if (!ctx) throw new Error('useAdminEdit must be used within AdminEditProvider');
  return ctx;
}

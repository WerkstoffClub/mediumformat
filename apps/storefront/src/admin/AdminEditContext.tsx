import {
  createContext, useContext, useEffect, useState, useCallback, type ReactNode,
} from 'react';
import axios from 'axios';
import {
  type AdminUser, isEditor, getToken, clearToken, login as apiLogin, fetchMe, adminApi,
} from './adminAuth';

export type EditEntity = 'categoryPage';
interface StagedEdit { entity: EditEntity; id: string; field: string; value: string; }
const keyOf = (entity: EditEntity, id: string, field: string) => `${entity}:${id}:${field}`;

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
  dirtyCount: number;
  saving: boolean;
  saveError: string | null;
  rev: number;                       // bumps on discard/save — Editable resets its DOM on change
  stage: (entity: EditEntity, id: string, field: string, value: string) => void;
  /** Display value: staged edit ?? just-saved value ?? the server value passed in. */
  getValue: (entity: EditEntity, id: string, field: string, serverValue: string) => string;
  discardAll: () => void;
  save: () => Promise<void>;
}

const AdminEditContext = createContext<AdminEditValue | null>(null);

export function AdminEditProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditModeState] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Record<string, StagedEdit>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [rev, setRev] = useState(0);

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
    setDirty({});
    setSaved({});
  }, []);

  const stage = useCallback((entity: EditEntity, id: string, field: string, value: string) => {
    setDirty(d => ({ ...d, [keyOf(entity, id, field)]: { entity, id, field, value } }));
  }, []);

  const getValue = useCallback(
    (entity: EditEntity, id: string, field: string, serverValue: string): string => {
      const k = keyOf(entity, id, field);
      if (k in dirty) return dirty[k].value;
      if (k in saved) return saved[k];
      return serverValue;
    },
    [dirty, saved],
  );

  const discardAll = useCallback(() => {
    setDirty({});
    setSaveError(null);
    setRev(r => r + 1);   // force Editable elements to reset their contentEditable DOM
  }, []);

  const save = useCallback(async () => {
    const edits = Object.values(dirty);
    if (edits.length === 0) return;
    setSaving(true);
    setSaveError(null);

    // Group by entity:id, then PATCH each entity once with its changed fields.
    const groups = new Map<string, { entity: EditEntity; id: string; fields: Record<string, string> }>();
    for (const e of edits) {
      const gk = `${e.entity}:${e.id}`;
      const g = groups.get(gk) ?? { entity: e.entity, id: e.id, fields: {} };
      g.fields[e.field] = e.value;
      groups.set(gk, g);
    }

    try {
      for (const g of groups.values()) {
        if (g.entity === 'categoryPage') {
          await adminApi.patch(`/category-pages/${g.id}`, g.fields);
        }
      }
      // Promote saved edits into the client overlay so they stay on screen,
      // then clear the dirty set. No reload / refetch needed.
      setSaved(s => {
        const next = { ...s };
        for (const e of edits) next[keyOf(e.entity, e.id, e.field)] = e.value;
        return next;
      });
      setDirty({});
      setRev(r => r + 1);
    } catch (err) {
      setSaveError(
        axios.isAxiosError(err) && err.response?.status === 401
          ? 'Your session expired — sign in again.'
          : 'Save failed — please try again.',
      );
    } finally {
      setSaving(false);
    }
  }, [dirty]);

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
      dirtyCount: Object.keys(dirty).length, saving, saveError, rev,
      stage, getValue, discardAll, save,
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

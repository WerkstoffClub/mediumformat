# Storefront Inline CMS — Phase 2: Admin Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. This phase is a cohesive, interdependent frontend unit — build it together, then review + verify.

**Goal:** Give the public storefront an admin session: recognise an already-logged-in back-office admin (shared-origin JWT), let them enter/exit an "edit mode" via a floating admin bar, with a login-popover fallback — all gated to ADMIN/MANAGER. No editable fields yet (that's Phase 3); this is the plumbing.

**Architecture:** A React context (`AdminEditProvider`) reads the back-office token from `localStorage['mf-access-token']` (same origin), verifies it via `GET /auth/me`, and exposes `{ user, isAdmin, editMode, … }`. A dedicated authed axios instance carries the bearer token for future mutations. A floating `AdminBar` (admin-only) toggles edit mode; an `AdminLoginPopover` (opened by a hotkey when no session) handles the fallback login. Follows the storefront's existing convention of loose local types (no `@mf/shared` dependency).

**Tech Stack:** React 18 + Vite + Tailwind + react-router-dom + axios (storefront). Verification: `tsc --noEmit` + `vite build` + browser (no unit runner in this app).

**Branch:** `feat/storefront-admin-session` (off `main`).

---

## Context an implementer needs

- Back-office stores its JWT at `localStorage['mf-access-token']` and sends `Authorization: Bearer <token>` (see `apps/backoffice/src/api/client.ts`). Storefront shares the origin `mediumformat.info`, so it can read the same key.
- Auth endpoints: `POST /api/v1/auth/login` → `{ accessToken, refreshToken, user }`; `GET /api/v1/auth/me` → the `User`. `User` shape: `{ id, email, name, role, createdAt, updatedAt }`. `role` ∈ `ADMIN | MANAGER | SHOPKEEPER | WHOLESALER | CUSTOMER`. **Editors = ADMIN or MANAGER** (matches the `@Roles(ADMIN, MANAGER)` guards on the mutation endpoints Phase 3 will call).
- Storefront public client: `apps/storefront/src/api/storefront.ts` (axios, `baseURL: '/api/v1'`, no auth). Leave it untouched; add a SEPARATE authed instance for admin calls.
- App shell: `apps/storefront/src/App.tsx` renders `<CurrencyProvider><BrowserRouter><Routes>…`. Global chrome lives in `apps/storefront/src/layouts/Shell.tsx` (`AnnouncementBar`, `Nav`, `<Outlet/>`, `Footer`, `NowPlayingBar`).
- Design system: monochrome (DESIGN.md v2.1). CSS vars used on storefront include `var(--canvas)`; reuse existing storefront token vars (inspect `apps/storefront/src/index.css`) — do not introduce brand colours. Shadow only on floating things (the admin bar qualifies).

---

## File Structure

- Create `apps/storefront/src/admin/adminAuth.ts` — token key + `getToken()`, `isEditor(role)` (pure), authed `adminApi` axios instance, `login()`, `getMe()`. Local types `AdminRole`/`AdminUser`.
- Create `apps/storefront/src/admin/AdminEditContext.tsx` — `AdminEditProvider` + `useAdminEdit()` hook (state machine + global hotkey).
- Create `apps/storefront/src/admin/AdminBar.tsx` — floating admin-only control (identity, edit-mode toggle, sign out).
- Create `apps/storefront/src/admin/AdminLoginPopover.tsx` — fallback login form popover.
- Modify `apps/storefront/src/App.tsx` — wrap the tree in `<AdminEditProvider>`.
- Modify `apps/storefront/src/layouts/Shell.tsx` — render `<AdminBar/>` + `<AdminLoginPopover/>` as global chrome.

---

## Task 1: `adminAuth.ts` — auth/client layer

**Files:** Create `apps/storefront/src/admin/adminAuth.ts`

- [ ] **Step 1: Write the module**

```ts
import axios from 'axios';

/** Same key the back-office writes (apps/backoffice/src/api/client.ts) — shared
 *  origin means the storefront can reuse an existing admin session. */
export const TOKEN_KEY = 'mf-access-token';

export type AdminRole = 'ADMIN' | 'MANAGER' | 'SHOPKEEPER' | 'WHOLESALER' | 'CUSTOMER';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AdminUser;
}

/** Only admins and managers may edit storefront content (mirrors the API's
 *  @Roles(ADMIN, MANAGER) mutation guards). */
export function isEditor(role: AdminRole | undefined | null): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Authed axios instance for admin mutations — separate from the public
 *  storefront client so anonymous reads never carry a token. */
export const adminApi = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

adminApi.interceptors.request.use(config => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) delete config.headers['Content-Type'];
  return config;
});

export async function login(email: string, password: string): Promise<AdminUser> {
  const res = await adminApi.post<AuthTokens>('/auth/login', { email, password });
  setToken(res.data.accessToken);
  return res.data.user;
}

export async function fetchMe(): Promise<AdminUser> {
  const res = await adminApi.get<AdminUser>('/auth/me');
  return res.data;
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/storefront && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/admin/adminAuth.ts
git commit -m "feat(storefront): admin auth client (shared-origin token reuse + authed axios)"
```

---

## Task 2: `AdminEditContext.tsx` — provider + hook + hotkey

**Files:** Create `apps/storefront/src/admin/AdminEditContext.tsx`

- [ ] **Step 1: Write the provider**

```tsx
import {
  createContext, useContext, useEffect, useState, useCallback, type ReactNode,
} from 'react';
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
      .catch(() => { if (!cancelled) { clearToken(); setUser(null); } })
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
    } catch {
      setLoginError('Incorrect email or password.');
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
```

- [ ] **Step 2: Type-check**

Run: `cd apps/storefront && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/admin/AdminEditContext.tsx
git commit -m "feat(storefront): AdminEditProvider — session reuse, edit-mode state, hotkey"
```

---

## Task 3: `AdminBar.tsx` — floating admin control

**Files:** Create `apps/storefront/src/admin/AdminBar.tsx`

Renders nothing for anonymous visitors. For an editor it shows a small floating bar (bottom-centre, above the Now-Playing bar) with identity, an edit-mode toggle, and sign out. Monochrome; shadow allowed (floating). Inspect `apps/storefront/src/index.css` for the actual token var names before styling and reuse them.

- [ ] **Step 1: Write the component**

```tsx
import { useAdminEdit } from './AdminEditContext';

export function AdminBar() {
  const { isAdmin, user, editMode, toggleEdit, signOut } = useAdminEdit();
  if (!isAdmin) return null;

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3
                 rounded-full border border-black/10 bg-white/95 px-4 py-2 text-[13px]
                 shadow-lg backdrop-blur dark:border-white/15 dark:bg-black/85"
      role="region"
      aria-label="Admin controls"
    >
      <span className="font-medium">{user?.name}</span>
      <span className="opacity-50">·</span>
      <button
        type="button"
        onClick={toggleEdit}
        aria-pressed={editMode}
        className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors
          ${editMode
            ? 'bg-black text-white dark:bg-white dark:text-black'
            : 'border border-black/20 hover:border-black/50 dark:border-white/25'}`}
      >
        {editMode ? 'Editing — on' : 'Edit mode'}
      </button>
      <button
        type="button"
        onClick={signOut}
        className="text-[12px] opacity-60 hover:opacity-100"
      >
        Sign out
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify token vars / dark-mode approach match the storefront**

Read `apps/storefront/src/index.css` and `apps/storefront/src/hooks/useTheme.ts`. If the storefront toggles dark mode via a `data-theme`/class other than Tailwind's `dark:` variant, replace the `dark:` utilities with the storefront's actual mechanism (e.g. `var(--surface)` / `var(--text)` tokens). Keep it monochrome and legible in both themes. Adjust `bottom-24` if it collides with the Now-Playing bar.

- [ ] **Step 3: Type-check + build**

Run: `cd apps/storefront && npx tsc --noEmit && npx vite build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src/admin/AdminBar.tsx
git commit -m "feat(storefront): floating admin bar with edit-mode toggle"
```

---

## Task 4: `AdminLoginPopover.tsx` — fallback login

**Files:** Create `apps/storefront/src/admin/AdminLoginPopover.tsx`

Modal/popover shown when `loginOpen`. Email + password → `signIn`. Renders nothing when closed. Admin types their own credentials (never pre-filled). Show `loginError` when present. Provide a labelled close control and an Escape-to-close.

- [ ] **Step 1: Write the component**

```tsx
import { useState, type FormEvent } from 'react';
import { useAdminEdit } from './AdminEditContext';

export function AdminLoginPopover() {
  const { loginOpen, loginError, signIn, closeLogin } = useAdminEdit();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loginOpen) return null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try { await signIn(email, password); } finally { setBusy(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Staff sign in"
      onKeyDown={e => { if (e.key === 'Escape') closeLogin(); }}
    >
      <form
        onSubmit={onSubmit}
        className="w-[min(92vw,360px)] rounded-2xl border border-black/10 bg-white p-6
                   shadow-2xl dark:border-white/15 dark:bg-neutral-900"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Staff sign in</h2>
          <button type="button" onClick={closeLogin} aria-label="Close" className="opacity-60 hover:opacity-100">✕</button>
        </div>
        <label className="mb-3 block text-[12px]">
          <span className="mb-1 block opacity-70">Email</span>
          <input
            type="email" autoComplete="username" value={email}
            onChange={e => setEmail(e.target.value)} required autoFocus
            className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-[13px] outline-none focus:border-black/50 dark:border-white/20"
          />
        </label>
        <label className="mb-4 block text-[12px]">
          <span className="mb-1 block opacity-70">Password</span>
          <input
            type="password" autoComplete="current-password" value={password}
            onChange={e => setPassword(e.target.value)} required
            className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-[13px] outline-none focus:border-black/50 dark:border-white/20"
          />
        </label>
        {loginError && <p className="mb-3 text-[12px] text-red-600 dark:text-red-400">{loginError}</p>}
        <button
          type="submit" disabled={busy}
          className="w-full rounded-lg bg-black py-2 text-[13px] font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Match dark-mode mechanism** (same note as Task 3 Step 2 — align with the storefront's theme approach and tokens).

- [ ] **Step 3: Type-check + build**

Run: `cd apps/storefront && npx tsc --noEmit && npx vite build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src/admin/AdminLoginPopover.tsx
git commit -m "feat(storefront): staff sign-in popover (login fallback)"
```

---

## Task 5: Wire the provider + chrome into the app

**Files:** Modify `apps/storefront/src/App.tsx`, `apps/storefront/src/layouts/Shell.tsx`

- [ ] **Step 1: Wrap the app in the provider**

In `App.tsx`, import `{ AdminEditProvider }` from `./admin/AdminEditContext` and wrap the existing tree (outermost, around `CurrencyProvider`):

```tsx
export default function App() {
  return (
    <AdminEditProvider>
      <CurrencyProvider>
        {/* …existing BrowserRouter/Routes unchanged… */}
      </CurrencyProvider>
    </AdminEditProvider>
  );
}
```

- [ ] **Step 2: Render the admin chrome globally**

In `Shell.tsx`, import `{ AdminBar }` and `{ AdminLoginPopover }` from `../admin/…` and render them inside the shell root (after `NowPlayingBar`):

```tsx
      <Footer />
      <NowPlayingBar />
      <AdminBar />
      <AdminLoginPopover />
    </div>
```

- [ ] **Step 3: Type-check + build**

Run: `cd apps/storefront && npx tsc --noEmit && npx vite build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src/App.tsx apps/storefront/src/layouts/Shell.tsx
git commit -m "feat(storefront): mount AdminEditProvider + admin bar/login chrome"
```

---

## Task 6: Deploy + verify

- [ ] **Step 1: Push + PR + merge** (`gh pr create --base main …`, then `gh pr merge --merge`), sync local `main`.
- [ ] **Step 2: Deploy** — `./deploy/docker/deploy-app.sh` (rebuilds + rsyncs the storefront dist; backend unchanged this phase).
- [ ] **Step 3: Verify on prod (browser, already logged into back-office → shared token):**
  - Visit `https://mediumformat.info/` → the floating **admin bar** appears (name + "Edit mode" + Sign out). Anonymous/incognito → no bar.
  - Click **Edit mode** → toggles to "Editing — on" (no editable fields yet — expected; that's Phase 3).
  - Clear the token (or incognito) + press **Ctrl/Cmd+Shift+E** → the **Staff sign in** popover opens; a CUSTOMER-role login is rejected with the role message; an ADMIN login shows the bar.
  - Screenshot the bar + popover for the user.

---

## Self-Review Notes

- **Spec coverage (D2):** token reuse via `mf-access-token` (Task 1/2), `GET /auth/me` role check → ADMIN/MANAGER gate (`isEditor`, Task 1/2), login-popover fallback (Task 4 + hotkey Task 2), authed axios instance for future mutations (Task 1), edit-mode toggle (Task 2/3). No editable fields (correctly deferred to Phase 3).
- **Placeholder scan:** the only "read the file and adapt" steps are the dark-mode/token-var alignment (Task 3/4 Step 2) — explicit because the storefront's exact theme mechanism must be matched, not guessed.
- **Type consistency:** `AdminUser`/`AdminRole`/`isEditor` are defined in `adminAuth.ts` and consumed unchanged by the context and components; `useAdminEdit()` value shape is identical across provider and consumers.
- **No unit runner in this app** — verification is `tsc` + `vite build` + browser (project convention); `isEditor` is a pure, trivially-correct predicate.

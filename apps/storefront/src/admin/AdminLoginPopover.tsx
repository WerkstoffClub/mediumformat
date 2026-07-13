import { useState, type FormEvent } from 'react';
import { useAdminEdit } from './AdminEditContext';

/**
 * Fallback login for admins with no active back-office session — opened by
 * the Ctrl/Cmd+Shift+E hotkey. Monochrome per DESIGN.md v2.1: reuses the
 * shared `.fld` / `.btn-primary` recipes (accent-token submit button) so it
 * matches every other form on the storefront. Credentials are always typed
 * by the admin, never pre-filled.
 */
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
      className="fixed inset-0 z-[210] flex items-center justify-center backdrop-blur-sm"
      style={{ background: 'rgba(0,0,0,.6)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Staff sign in"
      onClick={e => { if (e.target === e.currentTarget) closeLogin(); }}
      onKeyDown={e => { if (e.key === 'Escape') closeLogin(); }}
    >
      <form
        onSubmit={onSubmit}
        className="w-[min(92vw,360px)] rounded-[var(--r-lg)] border border-[var(--hairline)]
                   bg-[var(--surface)] p-6 shadow-[var(--e3)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[var(--ink)]">Staff sign in</h2>
          <button
            type="button"
            onClick={closeLogin}
            aria-label="Close"
            className="text-[var(--mute)] transition-colors hover:text-[var(--ink)]"
          >
            ✕
          </button>
        </div>
        <label className="mb-3 block text-[12px]">
          <span className="mb-1 block text-[var(--mute)]">Email</span>
          <input
            type="email" autoComplete="username" value={email}
            onChange={e => setEmail(e.target.value)} required autoFocus
            className="fld"
          />
        </label>
        <label className="mb-4 block text-[12px]">
          <span className="mb-1 block text-[var(--mute)]">Password</span>
          <input
            type="password" autoComplete="current-password" value={password}
            onChange={e => setPassword(e.target.value)} required
            className="fld"
          />
        </label>
        {loginError && (
          <p className="mb-3 text-[12px]" style={{ color: 'var(--danger)' }}>{loginError}</p>
        )}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/MF_Lockup_Black.svg" alt="Medium Format" className="h-[22px] w-auto mx-auto dark:hidden" />
          <img src="/MF_Lockup_White.svg" alt="Medium Format" className="h-[22px] w-auto mx-auto hidden dark:block" />
          <p className="text-[13px] text-[var(--text-muted)] mt-1">Backoffice</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 flex flex-col gap-4"
        >
          <div>
            <label className="block text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border)] rounded-md px-3 py-2 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
              placeholder="you@mediumformat.id"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border)] rounded-md px-3 py-2 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-[11px] text-[var(--danger)] text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50 text-[var(--accent-text)] font-bold text-[13px] py-2.5 rounded-md transition-colors mt-1"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

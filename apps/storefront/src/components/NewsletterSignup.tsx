import { useState } from 'react';
import { subscribeNewsletter } from '../api/storefront';
import { ApiError } from '../api/storefront';

interface NewsletterSignupProps {
  compact?: boolean;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterSignup({ compact = false }: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string>('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setStatus('error');
      setMessage('Please enter a valid email.');
      return;
    }
    setStatus('submitting');
    try {
      const result = await subscribeNewsletter(email.trim());
      setStatus('success');
      setMessage(
        result.already
          ? 'You are already on the list.'
          : 'Thanks — check your inbox.',
      );
      setEmail('');
    } catch (err) {
      setStatus('error');
      const msg =
        err instanceof ApiError && err.message
          ? err.message
          : 'Something went wrong. Try again shortly.';
      setMessage(msg);
    }
  }

  return (
    <div style={{ maxWidth: compact ? 360 : 480 }}>
      {!compact && (
        <>
          <div
            className="text-[12px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--mute)' }}
          >
            Newsletter
          </div>
          <h3
            className="text-[20px] font-semibold mt-2 mb-3"
            style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
          >
            New arrivals, in your inbox
          </h3>
          <p className="text-[13px] mb-4" style={{ color: 'var(--body)' }}>
            One email a week. Restocks, preorders, and a short note from the shop.
          </p>
        </>
      )}
      <form onSubmit={onSubmit} className="flex gap-2 flex-wrap sm:flex-nowrap">
        <label className="sr-only" htmlFor="mf-newsletter-email">
          Email address
        </label>
        <input
          id="mf-newsletter-email"
          type="email"
          required
          className="fld"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'submitting'}
          style={{ flex: 1, minWidth: 200 }}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={status === 'submitting'}
          style={{ whiteSpace: 'nowrap' }}
        >
          {status === 'submitting' ? 'Sending…' : 'Subscribe'}
        </button>
      </form>
      {message && status === 'success' && (
        <p className="mt-3 text-[13px]" style={{ color: 'var(--success)' }}>
          {message}
        </p>
      )}
      {message && status === 'error' && (
        <p className="mt-3 text-[13px]" style={{ color: 'var(--danger)' }}>
          {message}
        </p>
      )}
    </div>
  );
}

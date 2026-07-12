import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="max-w-[600px] mx-auto px-6 py-24 text-center">
      <div
        className="text-[12px] font-medium uppercase tracking-wider mb-4 mono"
        style={{ color: 'var(--mute)' }}
      >
        404
      </div>
      <h1
        className="text-[32px] md:text-[40px] font-semibold mb-4"
        style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}
      >
        Off the shelf
      </h1>
      <p className="text-[14px] mb-8" style={{ color: 'var(--body)' }}>
        The page you were looking for isn't here. It may have been moved or the record may
        have sold out.
      </p>
      <Link to="/" className="btn-primary">← Back to shop</Link>
    </div>
  );
}

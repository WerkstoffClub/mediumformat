import { Link } from 'react-router-dom';
import { NewsletterSignup } from './NewsletterSignup';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="mt-16"
      style={{
        background: 'var(--surface)',
        borderTop: '1px solid var(--hairline)',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div
              className="text-[18px] font-semibold tracking-[-0.04em] mb-3"
              style={{ color: 'var(--ink)' }}
            >
              Medium Format<span className="text-[8px] align-super ml-0.5">®</span>
            </div>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--body)' }}>
              An independent record shop in Jakarta. New arrivals, preorders, and a small
              journal on records that matter.
            </p>
          </div>
          <FooterCol title="Shop">
            <FLink to="/catalog">All records</FLink>
            <FLink to="/catalog?format=LP">LPs</FLink>
            <FLink to="/catalog?format=SEVEN_INCH">7&quot;</FLink>
            <FLink to="/catalog?format=CASSETTE">Cassettes</FLink>
            <FLink to="/preorders">Preorders</FLink>
          </FooterCol>
          <FooterCol title="Journal">
            <FLink to="/news">All posts</FLink>
          </FooterCol>
          <div>
            <NewsletterSignup compact />
          </div>
        </div>
        <div
          className="mt-10 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{ borderTop: '1px solid var(--hairline)' }}
        >
          <div className="text-[12px]" style={{ color: 'var(--mute)' }}>
            © {year} Medium Format. All rights reserved.
          </div>
          <div className="text-[12px] flex gap-4" style={{ color: 'var(--mute)' }}>
            <span>Made in Jakarta</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="text-[12px] font-medium uppercase tracking-wider mb-3"
        style={{ color: 'var(--mute)' }}
      >
        {title}
      </div>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        className="text-[13px] transition-colors"
        style={{ color: 'var(--body)' }}
      >
        {children}
      </Link>
    </li>
  );
}

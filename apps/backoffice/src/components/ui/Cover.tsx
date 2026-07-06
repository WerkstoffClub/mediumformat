import { useState } from 'react';

/** Monochrome vinyl-groove disc — the canonical Medium Format cover fallback. */
export function GrooveDisc() {
  return (
    <span className="relative flex items-center justify-center w-full h-full bg-[var(--bg-overlay)]" aria-hidden="true">
      <span
        className="rounded-full relative"
        style={{
          width: '64%',
          height: '64%',
          background: 'repeating-radial-gradient(circle at 50% 50%, var(--text-faint) 0 2px, transparent 2px 5px)',
        }}
      >
        <span className="absolute rounded-full" style={{ inset: '42%', background: 'var(--text-muted)' }} />
      </span>
    </span>
  );
}

function MerchGlyph() {
  return (
    <span className="flex items-center justify-center w-full h-full bg-[var(--bg-overlay)]" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="w-1/3 h-1/3 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M6 2 4 6v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-2-4z" />
        <path d="M4 6h16" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    </span>
  );
}

/** Release artwork with a guaranteed monochrome fallback: renders the image
    when present AND loadable; the groove disc (or merch glyph) otherwise. */
export function ReleaseCover({ imageUrl, format, alt = '' }: {
  imageUrl?: string | null;
  format?: string | null;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!imageUrl || failed) {
    return format === 'MERCH' ? <MerchGlyph /> : <GrooveDisc />;
  }
  return (
    <img
      src={imageUrl}
      alt={alt}
      loading="lazy"
      className="w-full h-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

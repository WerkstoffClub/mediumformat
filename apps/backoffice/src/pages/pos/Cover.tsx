import { useState } from 'react';
import type { PosProduct } from '../../api/pos';

/** Monochrome vinyl-groove disc — concentric grooves + a light label dot.
 *  NEVER coloured; this is the canonical Medium Format cover treatment. */
export function VinylCover({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const groove = size === 'sm' ? '58%' : '64%';
  return (
    <span
      className="relative flex items-center justify-center w-full h-full bg-[var(--bg-overlay)]"
      aria-hidden="true"
    >
      <span
        className="rounded-full relative"
        style={{
          width: groove,
          height: groove,
          background: 'repeating-radial-gradient(circle at 50% 50%, var(--text-faint) 0 2px, transparent 2px 5px)',
        }}
      >
        <span
          className="absolute rounded-full"
          style={{ inset: '42%', background: 'var(--text-muted)' }}
        />
      </span>
    </span>
  );
}

/** Merch / non-vinyl tile — a small monochrome glyph on a neutral surface. */
function MerchCover() {
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

/** Choose the right cover treatment for a product. */
export function ProductCover({ product, size = 'md' }: { product: PosProduct; size?: 'sm' | 'md' }) {
  const [failed, setFailed] = useState(false);
  if (product.imageUrl && !failed) {
    return <img src={product.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" onError={() => setFailed(true)} />;
  }
  return product.category === 'merch' ? <MerchCover /> : <VinylCover size={size} />;
}

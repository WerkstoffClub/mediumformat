import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Release } from '../api/storefront';
import { MAX_QTY, useCart } from '../hooks/useCart';

/** Release-page buy box: quantity stepper + add, then a direct path to the cart. */
export function AddToCart({ release }: { release: Release }) {
  const { add, lines } = useCart();
  const inCart = lines.find(l => l.releaseId === release.id)?.qty ?? 0;
  const room = Math.max(0, Math.min(release.stock, MAX_QTY) - inCart);
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  if (release.stock < 1) {
    return (
      <div className="mb-6">
        <button type="button" className="btn-primary w-full" disabled>Sold out</button>
      </div>
    );
  }

  const n = Math.min(qty, Math.max(room, 1));
  return (
    <div className="mb-6 flex flex-col gap-3">
      <div className="flex gap-3">
        <div className="qty-step" role="group" aria-label="Quantity">
          <button type="button" onClick={() => setQty(Math.max(1, n - 1))} disabled={n <= 1} aria-label="Decrease quantity">−</button>
          <span className="mono" aria-live="polite">{n}</span>
          <button type="button" onClick={() => setQty(Math.min(room, n + 1))} disabled={n >= room} aria-label="Increase quantity">+</button>
        </div>
        <button
          type="button"
          className="btn-primary flex-1"
          disabled={room < 1}
          onClick={() => { add(release, n); setQty(1); setJustAdded(true); }}
        >
          {room < 1 ? 'All available copies are in your cart' : 'Add to cart'}
        </button>
      </div>
      {(justAdded || inCart > 0) && (
        <p className="text-[13px] flex items-center justify-between gap-3" style={{ color: 'var(--body)' }}>
          <span>{inCart} in your cart</span>
          <Link to="/cart" className="cta-link">View cart &amp; checkout →</Link>
        </p>
      )}
    </div>
  );
}

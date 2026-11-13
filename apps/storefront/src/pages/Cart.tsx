import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useCurrency } from '../hooks/useCurrency';
import { CartThumb } from '../components/CartThumb';
import { FORMAT_LABEL } from '../components/ReleaseCard';

export default function Cart() {
  const { lines, count, subtotalIdr, setQty, remove } = useCart();
  const { formatPrice } = useCurrency();

  if (lines.length === 0) {
    return (
      <div className="co-wrap co-empty">
        <h1 className="co-h1">Your cart is empty</h1>
        <p>Records you add land here. Nothing is reserved until you place the order.</p>
        <Link to="/catalog" className="btn-primary">Browse the catalog</Link>
      </div>
    );
  }

  return (
    <div className="co-wrap">
      <div className="co-head">
        <h1 className="co-h1">Cart</h1>
        <span className="co-sub mono">{count} item{count === 1 ? '' : 's'}</span>
      </div>
      <div className="co-grid">
        <ul className="cart-list">
          {lines.map(l => {
            const to = l.slug ? `/releases/${encodeURIComponent(l.slug)}` : '#';
            const max = Math.min(l.stock, 10);
            return (
              <li key={l.releaseId} className="cart-row">
                <Link to={to}><CartThumb imageUrl={l.imageUrl} alt={`${l.artist} — ${l.title}`} /></Link>
                <div className="cart-info">
                  <Link to={to} className="cart-artist">{l.artist}</Link>
                  <div className="cart-title">{l.title}</div>
                  <div className="cart-meta">{FORMAT_LABEL[l.format] ?? l.format} · <span className="mono">{formatPrice(l.priceIdr)}</span></div>
                </div>
                <div className="qty-step" role="group" aria-label={`Quantity for ${l.title}`}>
                  <button type="button" onClick={() => setQty(l.releaseId, l.qty - 1)} disabled={l.qty <= 1} aria-label="Decrease quantity">−</button>
                  <span className="mono">{l.qty}</span>
                  <button type="button" onClick={() => setQty(l.releaseId, l.qty + 1)} disabled={l.qty >= max} aria-label="Increase quantity">+</button>
                </div>
                <div className="cart-line-total mono">{formatPrice(l.priceIdr * l.qty)}</div>
                <button type="button" className="cart-remove" onClick={() => remove(l.releaseId)} aria-label={`Remove ${l.title}`}>Remove</button>
              </li>
            );
          })}
        </ul>
        <aside className="co-summary">
          <div className="sum-row"><span>Subtotal</span><span className="mono">{formatPrice(subtotalIdr)}</span></div>
          <div className="sum-row sum-note"><span>Delivery</span><span>Confirmed with payment details</span></div>
          <div className="sum-row sum-total"><span>Total</span><span className="mono">{formatPrice(subtotalIdr)}</span></div>
          <Link to="/checkout" className="btn-primary w-full">Checkout</Link>
          <Link to="/catalog" className="btn-secondary w-full">Keep shopping</Link>
          <p className="sum-fine">Free delivery within Jakarta on orders over Rp 500.000. Prices are checked again when you place the order.</p>
        </aside>
      </div>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { checkVoucher, checkoutErrorMessage, placeOrder, type PlaceOrderInput } from '../api/storefront';
import { useCart } from '../hooks/useCart';
import { useCurrency } from '../hooks/useCurrency';
import { CartThumb } from '../components/CartThumb';

type Fulfilment = PlaceOrderInput['fulfilment'];
export const LAST_ORDER_KEY = 'mf-last-order';

const VOUCHER_REASON: Record<string, string> = {
  not_found: 'That code does not exist.',
  inactive: 'That code is no longer active.',
  not_started: 'That code is not active yet.',
  expired: 'That code has expired.',
  limit_reached: 'That code has been fully used.',
  below_minimum: 'Your subtotal is below this code’s minimum.',
};

export default function Checkout() {
  const { lines, subtotalIdr, clear } = useCart();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [fulfilment, setFulfilment] = useState<Fulfilment>('DELIVERY');
  const [voucher, setVoucher] = useState('');
  const [discount, setDiscount] = useState<{ code: string; idr: number } | null>(null);
  const [voucherMsg, setVoucherMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (lines.length === 0) return <Navigate to="/cart" replace />;

  const discountIdr = discount && discount.code === voucher.trim().toUpperCase() ? discount.idr : 0;

  async function applyVoucher() {
    const code = voucher.trim().toUpperCase();
    if (!code) return;
    setVoucherMsg(null);
    try {
      const r = await checkVoucher(code, subtotalIdr);
      if (r.valid) { setDiscount({ code, idr: r.discountIdr }); setVoucherMsg(`${code} applied.`); }
      else { setDiscount(null); setVoucherMsg(VOUCHER_REASON[r.reason ?? ''] ?? 'That code cannot be used.'); }
    } catch (err) {
      setVoucherMsg(checkoutErrorMessage(err));
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? '').trim() || undefined;
    setSubmitting(true);
    setError(null);
    try {
      const order = await placeOrder({
        customerName: get('name') ?? '',
        email: get('email') ?? '',
        phone: get('phone') ?? '',
        fulfilment,
        address: fulfilment === 'DELIVERY' ? get('address') : undefined,
        city: fulfilment === 'DELIVERY' ? get('city') : undefined,
        postalCode: fulfilment === 'DELIVERY' ? get('postalCode') : undefined,
        notes: get('notes'),
        voucherCode: discountIdr ? discount?.code : undefined,
        lines: lines.map(l => ({ releaseId: l.releaseId, qty: l.qty })),
      });
      try { sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order)); } catch { /* private mode */ }
      clear();
      navigate(`/order/${order.number}`, { replace: true });
    } catch (err) {
      setError(checkoutErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="co-wrap">
      <div className="co-head">
        <h1 className="co-h1">Checkout</h1>
        <Link to="/cart" className="cta-link">← Back to cart</Link>
      </div>
      <form className="co-grid" onSubmit={onSubmit} noValidate={false}>
        <div className="co-form">
          <fieldset className="co-section">
            <legend>Contact</legend>
            <label className="co-field"><span>Full name</span>
              <input className="fld" name="name" required minLength={2} maxLength={120} autoComplete="name" /></label>
            <div className="co-two">
              <label className="co-field"><span>Email</span>
                <input className="fld" name="email" type="email" required maxLength={160} autoComplete="email" /></label>
              <label className="co-field"><span>WhatsApp number</span>
                <input className="fld" name="phone" type="tel" required pattern="\+?[0-9 ()\-]{8,20}" placeholder="0812 3456 7890" autoComplete="tel" /></label>
            </div>
          </fieldset>

          <fieldset className="co-section">
            <legend>How do you want it?</legend>
            <div className="co-tiles" role="radiogroup">
              {([['DELIVERY', 'Delivery', 'Courier to your address. Cost confirmed with payment details.'],
                 ['PICKUP', 'Pick up in store', 'Collect at Medium Format, Jakarta, once paid.']] as const).map(([v, name, meta]) => (
                <label key={v} className={fulfilment === v ? 'co-tile on' : 'co-tile'}>
                  <input type="radio" name="fulfilment" value={v} checked={fulfilment === v} onChange={() => setFulfilment(v)} />
                  <span className="co-tile-name">{name}</span>
                  <span className="co-tile-meta">{meta}</span>
                </label>
              ))}
            </div>
            {fulfilment === 'DELIVERY' && (
              <>
                <label className="co-field"><span>Address</span>
                  <textarea className="fld" name="address" required minLength={5} maxLength={400} rows={3} autoComplete="street-address" /></label>
                <div className="co-two">
                  <label className="co-field"><span>City</span>
                    <input className="fld" name="city" required minLength={2} maxLength={80} autoComplete="address-level2" /></label>
                  <label className="co-field"><span>Postal code</span>
                    <input className="fld" name="postalCode" inputMode="numeric" maxLength={10} autoComplete="postal-code" /></label>
                </div>
              </>
            )}
            <label className="co-field"><span>Notes <em>optional</em></span>
              <textarea className="fld" name="notes" maxLength={600} rows={2} /></label>
          </fieldset>

          <fieldset className="co-section">
            <legend>Payment</legend>
            <p className="co-pay">After you place the order we send payment details (bank transfer or QRIS) to your WhatsApp and email. Your records are held for you while we wait for payment.</p>
          </fieldset>
        </div>

        <aside className="co-summary">
          <ul className="sum-lines">
            {lines.map(l => (
              <li key={l.releaseId}>
                <CartThumb imageUrl={l.imageUrl} alt={`${l.artist} — ${l.title}`} />
                <div className="sum-line-txt"><strong>{l.artist}</strong><span>{l.title}{l.qty > 1 ? ` × ${l.qty}` : ''}</span></div>
                <span className="mono">{formatPrice(l.priceIdr * l.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="co-voucher">
            <input className="fld" value={voucher} onChange={e => setVoucher(e.target.value)} placeholder="Voucher code" aria-label="Voucher code" maxLength={40} />
            <button type="button" className="btn-secondary" onClick={applyVoucher} disabled={!voucher.trim()}>Apply</button>
          </div>
          {voucherMsg && <p className="sum-fine" role="status">{voucherMsg}</p>}
          <div className="sum-row"><span>Subtotal</span><span className="mono">{formatPrice(subtotalIdr)}</span></div>
          {discountIdr > 0 && <div className="sum-row"><span>Voucher {discount?.code}</span><span className="mono">−{formatPrice(discountIdr)}</span></div>}
          <div className="sum-row sum-note"><span>Delivery</span><span>{fulfilment === 'PICKUP' ? 'Free (pickup)' : 'Confirmed with payment details'}</span></div>
          <div className="sum-row sum-total"><span>Total</span><span className="mono">{formatPrice(subtotalIdr - discountIdr)}</span></div>
          {error && <p className="co-error" role="alert">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Placing order…' : 'Place order'}
          </button>
          <p className="sum-fine">You pay nothing now. Prices and stock are checked again when you place the order.</p>
        </aside>
      </form>
    </div>
  );
}

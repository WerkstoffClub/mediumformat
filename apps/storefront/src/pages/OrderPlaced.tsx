import { Link, useParams } from 'react-router-dom';
import type { PlacedOrder } from '../api/storefront';
import { useCurrency } from '../hooks/useCurrency';
import { LAST_ORDER_KEY } from './Checkout';

function readLastOrder(number: string | undefined): PlacedOrder | null {
  try {
    const o = JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) ?? 'null') as PlacedOrder | null;
    return o && o.number === number ? o : null;
  } catch {
    return null;
  }
}

export default function OrderPlaced() {
  const { number } = useParams();
  const order = readLastOrder(number);
  const { formatPrice } = useCurrency();

  return (
    <div className="co-wrap co-done">
      <h1 className="co-h1">Order received</h1>
      <p className="co-done-num">Order number <strong className="mono">{number}</strong></p>
      <p className="co-done-lede">
        Thank you{order ? `, ${order.customerName.split(' ')[0]}` : ''}. We will send payment details to your
        WhatsApp and email shortly. Keep this order number for reference.
      </p>
      {order && (
        <div className="co-summary co-done-sum">
          <ul className="sum-lines">
            {order.lines.map(l => (
              <li key={l.releaseId}>
                <div className="sum-line-txt"><strong>{l.artist}</strong><span>{l.title}{l.qty > 1 ? ` × ${l.qty}` : ''}</span></div>
                <span className="mono">{formatPrice(l.unitPriceIdr * l.qty)}</span>
              </li>
            ))}
          </ul>
          {order.discountIdr > 0 && <div className="sum-row"><span>Voucher {order.voucherCode}</span><span className="mono">−{formatPrice(order.discountIdr)}</span></div>}
          <div className="sum-row sum-total"><span>Total</span><span className="mono">{formatPrice(order.totalIdr)}</span></div>
          <div className="sum-row sum-note"><span>{order.fulfilment === 'PICKUP' ? 'Pick up in store' : 'Delivery'}</span><span>{order.fulfilment === 'PICKUP' ? 'Free' : 'Cost confirmed with payment details'}</span></div>
        </div>
      )}
      <Link to="/catalog" className="btn-secondary">Back to the shop</Link>
    </div>
  );
}

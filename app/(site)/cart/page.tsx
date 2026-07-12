import Link from "next/link";
import { getCartView } from "@/lib/cart";
import { formatIdr } from "@/lib/format";
import { setQty, removeFromCart } from "./actions";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cart = await getCartView();

  if (cart.items.length === 0) {
    return (
      <div className="page-narrow">
        <h1 className="page-title">Cart</h1>
        <p className="page-lead">Your cart is empty.</p>
        <Link href="/shop" className="page-link">
          Browse the catalogue →
        </Link>
      </div>
    );
  }

  return (
    <div className="cart-layout">
      <div>
        <h1 className="page-title" style={{ marginBottom: 20 }}>
          Cart · {cart.count} {cart.count === 1 ? "item" : "items"}
        </h1>
        <div className="cart-lines">
          {cart.items.map((item) => (
            <div key={item.variantId} className="cart-line">
              <Link href={`/releases/${item.slug}`} className="cl-cover">
                {item.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.cover} alt={item.title} />
                ) : (
                  <div className="cover-art">
                    <div className="grooves" />
                  </div>
                )}
              </Link>
              <div>
                {item.artist && <div className="cl-artist">{item.artist}</div>}
                <Link href={`/releases/${item.slug}`} className="cl-title">
                  {item.title}
                </Link>
                <div className="cl-meta">
                  {item.condition ? `Condition ${item.condition} · ` : ""}
                  {formatIdr(item.unitPrice)} each
                </div>
              </div>
              <div className="cl-right">
                <span className="cl-price">{formatIdr(item.lineTotal)}</span>
                <div className="cl-actions">
                  <form action={setQty}>
                    <input type="hidden" name="variantId" value={item.variantId} />
                    <input type="hidden" name="delta" value="-1" />
                    <button className="qty-btn" aria-label="Decrease quantity">−</button>
                  </form>
                  <span className="qty-val">{item.qty}</span>
                  <form action={setQty}>
                    <input type="hidden" name="variantId" value={item.variantId} />
                    <input type="hidden" name="delta" value="1" />
                    <button className="qty-btn" aria-label="Increase quantity">+</button>
                  </form>
                  <form action={removeFromCart}>
                    <input type="hidden" name="variantId" value={item.variantId} />
                    <button className="link-btn">Remove</button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="summary">
        <h3>Order summary</h3>
        <div className="sum-row">
          <span>Subtotal</span>
          <span>{formatIdr(cart.subtotal)}</span>
        </div>
        <div className="sum-row">
          <span>PPN (tax)</span>
          <span>{formatIdr(cart.tax)}</span>
        </div>
        <div className="sum-row">
          <span>Shipping</span>
          <span>Calculated at checkout</span>
        </div>
        <div className="sum-total">
          <span>Total</span>
          <span>{formatIdr(cart.total)}</span>
        </div>
        <Link href="/checkout" className="btn-primary">
          Proceed to checkout
        </Link>
        <Link href="/shop" className="btn-secondary">
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}

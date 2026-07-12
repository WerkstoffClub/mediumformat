import Link from "next/link";
import { redirect } from "next/navigation";
import { getCartView } from "@/lib/cart";
import { formatIdr } from "@/lib/format";
import { placeOrder } from "../cart/actions";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const cart = await getCartView();
  if (cart.items.length === 0) redirect("/cart");

  return (
    <div className="cart-layout">
      <div>
        <h1 className="page-title" style={{ marginBottom: 20 }}>
          Checkout
        </h1>
        <form action={placeOrder}>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input className="input" id="name" name="name" required autoComplete="name" />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input className="input" id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input className="input" id="phone" name="phone" autoComplete="tel" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="address">Shipping address</label>
            <input className="input" id="address" name="address" required autoComplete="street-address" />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="city">City</label>
              <input className="input" id="city" name="city" autoComplete="address-level2" />
            </div>
            <div className="field">
              <label htmlFor="postal">Postal code</label>
              <input className="input" id="postal" name="postal" autoComplete="postal-code" />
            </div>
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: 8, width: "100%" }}>
            Place order
          </button>
          <p className="page-lead" style={{ fontSize: 12, marginTop: 12 }}>
            Payment (Xendit: QRIS, VA, e-wallets) is wired next — this creates a
            pending order our team will confirm.
          </p>
        </form>
      </div>

      <aside className="summary">
        <h3>Order summary</h3>
        {cart.items.map((item) => (
          <div key={item.variantId} className="sum-row">
            <span>
              {item.qty}× {item.artist ? `${item.artist} — ` : ""}
              {item.title}
            </span>
            <span>{formatIdr(item.lineTotal)}</span>
          </div>
        ))}
        <div className="sum-row">
          <span>PPN (tax)</span>
          <span>{formatIdr(cart.tax)}</span>
        </div>
        <div className="sum-total">
          <span>Total</span>
          <span>{formatIdr(cart.total)}</span>
        </div>
        <Link href="/cart" className="btn-secondary">
          Back to cart
        </Link>
      </aside>
    </div>
  );
}

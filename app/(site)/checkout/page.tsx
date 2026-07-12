import Link from "next/link";
import { redirect } from "next/navigation";
import { getCartView } from "@/lib/cart";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatIdr } from "@/lib/format";
import { ShippingRates } from "@/components/site/ShippingRates";
import { placeOrder } from "../cart/actions";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const cart = await getCartView();
  if (cart.items.length === 0) redirect("/cart");

  const session = await auth();
  const addresses = session?.user?.id
    ? await prisma.address.findMany({
        where: { userId: session.user.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      })
    : [];

  return (
    <div className="cart-layout">
      <div>
        <h1 className="page-title" style={{ marginBottom: 20 }}>
          Checkout
        </h1>
        <form action={placeOrder}>
          {addresses.length > 0 && (
            <div className="field">
              <label>Ship to a saved address</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                {addresses.map((a, i) => (
                  <label key={a.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--body)" }}>
                    <input type="radio" name="addressId" value={a.id} defaultChecked={i === 0} />
                    <span>
                      <strong style={{ color: "var(--ink)" }}>{a.name}</strong> — {a.line1}
                      {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.province} {a.postal}
                    </span>
                  </label>
                ))}
                <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "var(--body)" }}>
                  <input type="radio" name="addressId" value="" /> Use a new address ↓
                </label>
              </div>
            </div>
          )}

          <div className="field">
            <label htmlFor="name">Full name</label>
            <input className="input" id="name" name="name" required={addresses.length === 0} autoComplete="name" />
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
            <input className="input" id="address" name="address" required={addresses.length === 0} autoComplete="street-address" />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="city">City</label>
              <input className="input" id="city" name="city" autoComplete="address-level2" />
            </div>
            <div className="field">
              <label htmlFor="province">Province</label>
              <input className="input" id="province" name="province" autoComplete="address-level1" />
            </div>
          </div>
          <ShippingRates weightGrams={cart.weightGrams} cartTotal={cart.total} />
          {session?.user?.id && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--body)", margin: "4px 0 8px" }}>
              <input type="checkbox" name="saveAddress" /> Save this address to my account
            </label>
          )}
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

import Link from "next/link";

export default function CheckoutPage() {
  return (
    <div className="page-narrow">
      <h1 className="page-title">Checkout</h1>
      <p className="page-lead">
        Xendit unified checkout (QRIS, VA, e-wallets) will be wired here.
      </p>
      <Link href="/cart" className="page-link">
        Back to cart →
      </Link>
    </div>
  );
}

import Link from "next/link";

export default function CartPage() {
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

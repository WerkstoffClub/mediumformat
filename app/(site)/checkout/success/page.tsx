import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatIdr } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: number } = await searchParams;
  if (!number) return notFound();

  const order = await prisma.order.findUnique({
    where: { number },
    include: { items: true },
  });
  if (!order) return notFound();

  return (
    <div className="confirm">
      <div className="confirm-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <h1>Thank you — order received</h1>
      <p className="confirm-num">Order {order.number}</p>

      <div className="confirm-card">
        {order.items.map((item) => (
          <div key={item.id} className="sum-row">
            <span>
              {item.qty}× {item.nameSnapshot}
              {item.conditionSnapshot ? ` · ${item.conditionSnapshot}` : ""}
            </span>
            <span>{formatIdr(Number(item.unitPriceIdr.toString()) * item.qty)}</span>
          </div>
        ))}
        <div className="sum-row">
          <span>PPN (tax)</span>
          <span>{formatIdr(order.tax.toString())}</span>
        </div>
        <div className="sum-total">
          <span>Total</span>
          <span>{formatIdr(order.total.toString())}</span>
        </div>
      </div>

      <p className="page-lead" style={{ marginTop: 24 }}>
        We&apos;ll email payment instructions shortly. Your order is pending payment.
      </p>
      <Link href="/shop" className="page-link">
        Continue shopping →
      </Link>
    </div>
  );
}

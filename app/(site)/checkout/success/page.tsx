import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatIdr } from "@/lib/format";
import { xendit } from "@/lib/integrations/xendit/client";
import { markOrderPaid } from "@/lib/fulfillment";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: number } = await searchParams;
  if (!number) return notFound();

  let order = await prisma.order.findUnique({
    where: { number },
    include: { items: true, payments: { orderBy: { createdAt: "desc" } } },
  });
  if (!order) return notFound();

  // If still pending and we have a Xendit invoice, reconcile live (in case the
  // webhook hasn't landed yet), then re-read the order.
  const payment = order.payments[0];
  if (
    payment?.status === "PENDING" &&
    payment.gatewayRef &&
    process.env.XENDIT_SECRET_KEY
  ) {
    try {
      const inv = (await xendit.getInvoice(payment.gatewayRef)) as { status?: string };
      const s = (inv.status ?? "").toUpperCase();
      if (s === "PAID" || s === "SETTLED") {
        await markOrderPaid(order.id, "XENDIT");
        order = await prisma.order.findUnique({
          where: { number },
          include: { items: true, payments: { orderBy: { createdAt: "desc" } } },
        });
      }
    } catch {
      // Ignore — show the current (pending) state.
    }
  }
  if (!order) return notFound();

  const paid =
    order.status === "PAID" ||
    order.status === "PACKED" ||
    order.status === "SHIPPED" ||
    order.status === "COMPLETED" ||
    order.payments.some((p) => p.status === "PAID");

  return (
    <div className="confirm">
      {paid ? (
        <>
          <div className="confirm-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h1>Payment received — thank you</h1>
        </>
      ) : (
        <>
          <div
            className="confirm-badge"
            style={{ background: "var(--warning-t)", color: "var(--warning)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <h1>Order received — awaiting payment</h1>
        </>
      )}
      <p className="confirm-num">
        Order {order.number} ·{" "}
        <span style={{ color: paid ? "var(--success)" : "var(--warning)" }}>
          {paid ? "Paid" : "Pending payment"}
        </span>
      </p>

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
        {paid
          ? "We're preparing your order. You'll get a shipping update by email."
          : "Complete payment to confirm your order."}
      </p>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
        {!paid && (
          <Link href={`/checkout/success?order=${order.number}`} className="page-link">
            Check payment status
          </Link>
        )}
        <Link href="/shop" className="page-link">
          Continue shopping →
        </Link>
      </div>
    </div>
  );
}

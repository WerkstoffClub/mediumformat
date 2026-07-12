import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatIdr } from "@/lib/format";
import { PrintButton } from "@/components/admin/PrintButton";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, channel: true, payments: { orderBy: { createdAt: "desc" } } },
  });
  if (!order) return notFound();

  const payment = order.payments.find((p) => p.status === "PAID") ?? order.payments[0];

  return (
    <>
      <div className="greet no-print">
        <div>
          <div className="greet-eyebrow">
            <Link href={`/admin/orders/${order.id}`} className="link">← Order</Link>
          </div>
          <h1 className="greet-h1">Receipt</h1>
        </div>
        <div className="greet-right">
          <PrintButton />
        </div>
      </div>

      <div className="receipt">
        <h2>MEDIUM·FORMAT</h2>
        <div className="r-sub">Jl. Kemang Raya No. 15, Jakarta</div>

        <div className="r-row"><span>Order</span><span>{order.number}</span></div>
        <div className="r-row">
          <span>Date</span>
          <span>
            {order.createdAt.toLocaleString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="r-row"><span>Channel</span><span>{order.channel.name}</span></div>

        <div className="r-hr" />

        {order.items.map((it) => (
          <div className="r-item" key={it.id}>
            <div className="r-row">
              <span>
                {it.qty}× {it.nameSnapshot}
              </span>
              <span>{formatIdr(Number(it.unitPriceIdr.toString()) * it.qty)}</span>
            </div>
            {it.conditionSnapshot && (
              <div style={{ color: "#666" }}>cond {it.conditionSnapshot}</div>
            )}
          </div>
        ))}

        <div className="r-hr" />

        <div className="r-row"><span>Subtotal</span><span>{formatIdr(order.subtotal.toString())}</span></div>
        <div className="r-row"><span>PPN</span><span>{formatIdr(order.tax.toString())}</span></div>
        <div className="r-row r-total"><span>TOTAL</span><span>{formatIdr(order.total.toString())}</span></div>
        {payment && (
          <div className="r-row">
            <span>Paid · {payment.method ?? payment.gateway}</span>
            <span>{formatIdr(payment.amount.toString())}</span>
          </div>
        )}

        <div className="r-foot">
          Thank you!
          <br />
          mediumformat.info
        </div>
      </div>
    </>
  );
}

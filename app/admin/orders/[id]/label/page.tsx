import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PrintButton } from "@/components/admin/PrintButton";

export const dynamic = "force-dynamic";

export default async function LabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      shippingAddress: true,
      shipments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) return notFound();

  const shipment = order.shipments[0];
  const awb = shipment?.awb ?? order.number;
  const courier = shipment?.courier ?? "";
  const service = shipment?.service ?? "";
  const a = order.shippingAddress;

  const origin = {
    name: process.env.BITESHIP_ORIGIN_NAME ?? "Medium Format",
    address: process.env.BITESHIP_ORIGIN_ADDRESS ?? "Jl. Kemang Raya No. 15, Jakarta Selatan",
    postal: process.env.BITESHIP_ORIGIN_POSTAL ?? "12730",
    phone: process.env.BITESHIP_ORIGIN_PHONE ?? "",
  };

  return (
    <>
      <div className="greet no-print">
        <div>
          <div className="greet-eyebrow">
            <Link href={`/admin/orders/${order.id}`} className="link">
              ← Order {order.number}
            </Link>
          </div>
          <h1 className="greet-h1">Shipping label</h1>
        </div>
        <div className="greet-right">
          <PrintButton label="Print label" />
        </div>
      </div>

      <div className="awb-label">
        <div className="awb-hd">
          <span className="awb-brand">MEDIUM·FORMAT</span>
          <span className="awb-courier">
            {courier}
            {service ? ` · ${service}` : ""}
          </span>
        </div>

        <div className="awb-code">
          <img src={`/api/barcode?text=${encodeURIComponent(awb)}&type=code128`} alt={`AWB ${awb}`} />
          <div className="awb-no">{awb}</div>
        </div>

        <div className="awb-party">
          <div className="awb-role">Ship to</div>
          {a ? (
            <>
              <div className="awb-name">{a.name}</div>
              <div>
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
              </div>
              <div>{[a.city, a.province, a.postal].filter(Boolean).join(", ")}</div>
              {a.phone ? <div>{a.phone}</div> : null}
            </>
          ) : (
            <div className="awb-name">See order notes</div>
          )}
        </div>

        <div className="awb-party">
          <div className="awb-role">From</div>
          <div className="awb-name">{origin.name}</div>
          <div>{origin.address}</div>
          <div>{origin.postal}</div>
          {origin.phone ? <div>{origin.phone}</div> : null}
        </div>

        <div className="awb-items">
          <div className="awb-role" style={{ marginBottom: 4 }}>
            Contents · Order {order.number}
          </div>
          {order.items.map((it) => (
            <div className="awb-il" key={it.id}>
              <span>{it.nameSnapshot}</span>
              <span>×{it.qty}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

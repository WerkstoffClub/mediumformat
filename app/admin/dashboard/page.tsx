import { prisma } from "@/lib/db";
import { formatIdr } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
  const [orderCount, productCount, lowStockCount, paidTodayAgg] = await Promise.all([
    prisma.order.count(),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.stock.count({ where: { onHand: { lte: 1 } } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: {
        status: { in: ["PAID", "PACKED", "SHIPPED", "COMPLETED"] },
        createdAt: { gte: startOfDay },
      },
    }),
  ]);

  const kpis = [
    { label: "Today's revenue", value: formatIdr(paidTodayAgg._sum.total?.toString() ?? 0) },
    { label: "Total orders", value: orderCount.toLocaleString("en-US") },
    { label: "Active products", value: productCount.toLocaleString("en-US") },
    { label: "Low-stock variants", value: lowStockCount.toLocaleString("en-US") },
  ];

  return (
    <>
      <div className="greet">
        <div>
          <div className="greet-eyebrow">Back office</div>
          <h1 className="greet-h1">Dashboard</h1>
          <div className="greet-sub">Live figures across every channel.</div>
        </div>
      </div>

      <div className="kpis">
        {kpis.map((k) => (
          <div className="kpi" key={k.label}>
            <div className="kpi-lbl">{k.label}</div>
            <div className="kpi-val">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <div className="panel-hdr">
          <span className="panel-title">Getting started</span>
        </div>
        <div style={{ padding: 18, color: "var(--body)", fontSize: 13, lineHeight: 1.7 }}>
          Charts, recent orders, and channel health land here as MVP-1 progresses.
          Head to <strong style={{ color: "var(--ink)" }}>Inventory</strong> to enrich
          your catalogue from Discogs &amp; Apple Music.
        </div>
      </div>
    </>
  );
}

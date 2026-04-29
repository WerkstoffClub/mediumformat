import { prisma } from "@/lib/db";
import { formatIdr } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [orderCount, productCount, lowStockCount, paidTodayAgg] = await Promise.all([
    prisma.order.count(),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.stock.count({ where: { onHand: { lte: 1 } } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: {
        status: { in: ["PAID", "PACKED", "SHIPPED", "COMPLETED"] },
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  return (
    <div className="px-8 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat label="Today's revenue" value={formatIdr(paidTodayAgg._sum.total?.toString() ?? 0)} />
        <Stat label="Total orders" value={orderCount.toString()} />
        <Stat label="Active products" value={productCount.toString()} />
        <Stat label="Low stock variants" value={lowStockCount.toString()} />
      </div>
      <p className="mt-10 text-sm text-zinc-500">
        Charts, recent orders, and channel health land here as MVP-1 progresses.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

import { PageShell } from "@/components/admin/PageShell";
import { prisma } from "@/lib/db";
import { formatIdr } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    include: { channel: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <PageShell title="Orders" description="Unified across all sales channels.">
      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3">Order #</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  No orders yet.
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3 font-mono">{o.number}</td>
                <td className="px-4 py-3">{o.channel.name}</td>
                <td className="px-4 py-3">{o.status}</td>
                <td className="px-4 py-3 text-right font-mono">
                  {formatIdr(o.total.toString())}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {o.createdAt.toLocaleString("en-US")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}

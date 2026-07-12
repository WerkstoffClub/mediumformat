import { PageShell } from "@/components/admin/PageShell";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { _count: { select: { orders: true } }, customerProfile: true },
  });

  return (
    <PageShell title="Customers" description="Profiles, order history, wholesale approval.">
      {customers.length === 0 ? (
        <div className="coming">No customers yet.</div>
      ) : (
        <div className="panel">
          <div className="panel-hdr">
            <span className="panel-title">Customers · {customers.length}</span>
          </div>
          <div className="atable-wrap">
            <table className="atable">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th className="t-right">Orders</th>
                  <th>Tags</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="t-ink">{c.name ?? "—"}</td>
                    <td>{c.email}</td>
                    <td className="cell-sub">{c.phone ?? "—"}</td>
                    <td className="t-right mono">{c._count.orders}</td>
                    <td>
                      {c.customerProfile?.vip && <span className="pill pill-info">VIP</span>}
                      {c.customerProfile?.wholesaleApproved && (
                        <span className="pill pill-ok">Wholesale</span>
                      )}
                    </td>
                    <td className="cell-sub">
                      {c.createdAt.toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageShell>
  );
}

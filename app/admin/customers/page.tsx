import { PageShell } from "@/components/admin/PageShell";
import { prisma } from "@/lib/db";
import { approveWholesale, revokeWholesale } from "./actions";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await prisma.user.findMany({
    where: { role: { in: ["CUSTOMER", "WHOLESALER"] } },
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
                  <th className="t-right">Orders</th>
                  <th>Tier</th>
                  <th>Joined</th>
                  <th className="t-right">Wholesale</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const approved =
                    c.role === "WHOLESALER" && c.customerProfile?.wholesaleApproved;
                  return (
                    <tr key={c.id}>
                      <td className="t-ink">{c.name ?? "—"}</td>
                      <td>{c.email}</td>
                      <td className="t-right mono">{c._count.orders}</td>
                      <td>
                        {approved ? (
                          <span className="pill pill-ok">Wholesale</span>
                        ) : (
                          <span className="pill">Retail</span>
                        )}
                        {c.customerProfile?.vip && (
                          <span className="pill pill-info" style={{ marginLeft: 6 }}>VIP</span>
                        )}
                      </td>
                      <td className="cell-sub">
                        {c.createdAt.toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="t-right">
                        {approved ? (
                          <form action={revokeWholesale}>
                            <input type="hidden" name="userId" value={c.id} />
                            <button className="link-danger" type="submit">Revoke</button>
                          </form>
                        ) : (
                          <form action={approveWholesale}>
                            <input type="hidden" name="userId" value={c.id} />
                            <button className="link" type="submit">Approve</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageShell>
  );
}

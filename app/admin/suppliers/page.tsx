import Link from "next/link";
import { PageShell } from "@/components/admin/PageShell";
import { prisma } from "@/lib/db";
import { createSupplier, deleteSupplier } from "./actions";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { purchaseOrders: true } } },
  });

  return (
    <PageShell
      title="Suppliers"
      description="Save suppliers once, then reuse them on purchase orders."
    >
      <form action={createSupplier} className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-hdr"><span className="panel-title">New supplier</span></div>
        <div className="panel-body">
          <div className="form-row">
            <div className="field"><label htmlFor="name">Name *</label><input className="input" id="name" name="name" required /></div>
            <div className="field"><label htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" /></div>
          </div>
          <div className="form-row">
            <div className="field"><label htmlFor="phone">Phone</label><input className="input" id="phone" name="phone" /></div>
            <div className="field"><label htmlFor="notes">Notes</label><input className="input" id="notes" name="notes" /></div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">Add supplier</button>
          </div>
        </div>
      </form>

      {suppliers.length === 0 ? (
        <div className="coming">No suppliers yet.</div>
      ) : (
        <div className="panel">
          <div className="panel-hdr">
            <span className="panel-title">Suppliers · {suppliers.length}</span>
          </div>
          <div className="atable-wrap">
            <table className="atable">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th className="t-right">POs</th>
                  <th className="t-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td className="t-ink">{s.name}</td>
                    <td>{s.email ?? "—"}</td>
                    <td className="cell-sub">{s.phone ?? "—"}</td>
                    <td className="t-right mono">{s._count.purchaseOrders}</td>
                    <td>
                      <div className="row-actions">
                        <Link href={`/admin/suppliers/${s.id}`} className="link">Edit</Link>
                        <form action={deleteSupplier}>
                          <input type="hidden" name="id" value={s.id} />
                          <button className="link-danger" type="submit">Delete</button>
                        </form>
                      </div>
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

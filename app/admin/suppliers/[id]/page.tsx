import { notFound } from "next/navigation";
import { PageShell } from "@/components/admin/PageShell";
import { prisma } from "@/lib/db";
import { updateSupplier, deleteSupplier } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) return notFound();

  return (
    <PageShell
      title="Edit supplier"
      description={supplier.name}
      actions={
        <form action={deleteSupplier}>
          <input type="hidden" name="id" value={supplier.id} />
          <button className="btn-danger" type="submit">Delete</button>
        </form>
      }
    >
      <form action={updateSupplier} className="panel editor" style={{ maxWidth: 640 }}>
        <input type="hidden" name="id" value={supplier.id} />
        <div className="panel-hdr"><span className="panel-title">Supplier</span></div>
        <div className="panel-body">
          <div className="form-row">
            <div className="field"><label htmlFor="name">Name *</label><input className="input" id="name" name="name" defaultValue={supplier.name} required /></div>
            <div className="field"><label htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" defaultValue={supplier.email ?? ""} /></div>
          </div>
          <div className="form-row">
            <div className="field"><label htmlFor="phone">Phone</label><input className="input" id="phone" name="phone" defaultValue={supplier.phone ?? ""} /></div>
            <div className="field"><label htmlFor="notes">Notes</label><input className="input" id="notes" name="notes" defaultValue={supplier.notes ?? ""} /></div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">Save changes</button>
            <a href="/admin/suppliers" className="btn-sec">Cancel</a>
          </div>
        </div>
      </form>
    </PageShell>
  );
}

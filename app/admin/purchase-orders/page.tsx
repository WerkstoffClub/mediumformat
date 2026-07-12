import { PageShell } from "@/components/admin/PageShell";
import { InvoiceParser } from "@/components/admin/InvoiceParser";

export const dynamic = "force-dynamic";

export default function PurchaseOrderPage() {
  return (
    <PageShell
      title="Purchase Order"
      description="Import a supplier invoice to parse line items, quantities and totals."
    >
      <InvoiceParser />
    </PageShell>
  );
}

import { PageShell, ComingSoon } from "@/components/admin/PageShell";

export default function InventoryPage() {
  return (
    <PageShell
      title="Inventory"
      description="Stock by location, movements, receiving, stocktake."
    >
      <ComingSoon phase="MVP-1" />
    </PageShell>
  );
}

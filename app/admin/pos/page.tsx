import { PageShell, ComingSoon } from "@/components/admin/PageShell";

export default function PosPage() {
  return (
    <PageShell
      title="POS"
      description="In-store checkout. Tablet web app · barcode scanning · label printing."
    >
      <ComingSoon phase="MVP-2" />
    </PageShell>
  );
}

import { PageShell, ComingSoon } from "@/components/admin/PageShell";

export default function CatalogPage() {
  return (
    <PageShell
      title="Catalog"
      description="Releases, merch, and Discogs imports."
    >
      <ComingSoon phase="MVP-1" />
    </PageShell>
  );
}

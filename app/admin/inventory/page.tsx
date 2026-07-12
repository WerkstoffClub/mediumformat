import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatIdr } from "@/lib/format";
import { artistsLabel, conditionLabel } from "@/lib/catalog";
import { PageShell } from "@/components/admin/PageShell";
import { CoverImg } from "@/components/site/CoverImg";

export const dynamic = "force-dynamic";

// Enqueue Discogs enrichment (metadata + artwork + tracklist) and Apple Music
// media resolution for every eligible release. Runs in the background worker.
async function enrichAction() {
  "use server";
  const session = await auth();
  if (!can(session?.user?.role, "catalog.write")) {
    throw new Error("Forbidden");
  }
  const { queues } = await import("@/jobs/queues");
  await queues.discogsSync.add("enrich-catalog", {});
  redirect("/admin/inventory?queued=1");
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ queued?: string }>;
}) {
  const { queued } = await searchParams;

  const [variants, eligibleCount, missingMetaCount] = await Promise.all([
    prisma.variant.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { product: { include: { release: true } }, stock: true },
    }),
    prisma.release.count({
      where: { OR: [{ discogsId: { not: null } }, { extBarcode: { not: null } }] },
    }),
    prisma.release.count({
      where: {
        lastSyncedAt: null,
        OR: [{ discogsId: { not: null } }, { extBarcode: { not: null } }],
      },
    }),
  ]);

  const totalOnHand = variants.reduce(
    (sum, v) => sum + v.stock.reduce((s, st) => s + st.onHand, 0),
    0,
  );

  const kpis = [
    { label: "Variants (SKUs)", value: variants.length.toString() },
    { label: "Units on hand", value: totalOnHand.toString() },
    { label: "Enrichable releases", value: eligibleCount.toString() },
    { label: "Awaiting metadata", value: missingMetaCount.toString() },
  ];

  return (
    <PageShell
      title="Inventory"
      description="Stock by variant, linked to the catalog. Enrich from Discogs + Apple Music."
      actions={
        <form action={enrichAction}>
          <button type="submit" className="btn-primary" disabled={eligibleCount === 0}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            Enrich {eligibleCount} from Discogs + Apple Music
          </button>
        </form>
      }
    >
      {queued && (
        <div className="banner-ok">
          Enrichment queued. The worker is pulling metadata, artwork, and track
          previews in the background — refresh in a moment to see it land.
        </div>
      )}

      <div className="kpis" style={{ marginBottom: 18 }}>
        {kpis.map((k) => (
          <div className="kpi" key={k.label}>
            <div className="kpi-lbl">{k.label}</div>
            <div className="kpi-val">{k.value}</div>
          </div>
        ))}
      </div>

      {variants.length === 0 ? (
        <div className="coming">No variants yet. Add catalog items to see them here.</div>
      ) : (
        <div className="panel">
          <div className="panel-hdr">
            <span className="panel-title">Catalog · Stock</span>
          </div>
          <div className="atable-wrap">
            <table className="atable">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>SKU</th>
                  <th>Condition</th>
                  <th className="t-right">Price</th>
                  <th className="t-right">On hand</th>
                  <th className="t-right">Reserved</th>
                  <th>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => {
                  const release = v.product.release;
                  const cover = v.product.heroImage ?? release?.coverUrl ?? null;
                  const artist = release ? artistsLabel(release.artistsJson) : null;
                  const onHand = v.stock.reduce((s, st) => s + st.onHand, 0);
                  const reserved = v.stock.reduce((s, st) => s + st.reserved, 0);
                  const synced = Boolean(release?.lastSyncedAt);
                  const enrichable = Boolean(release?.discogsId || release?.extBarcode);

                  return (
                    <tr key={v.id}>
                      <td>
                        <div className="cell-item">
                          <div className="cell-cover">
                            <CoverImg src={cover} alt={v.product.title} />
                          </div>
                          <div>
                            {artist && <div className="cell-sub">{artist}</div>}
                            <div className="t-ink">{v.product.title}</div>
                          </div>
                        </div>
                      </td>
                      <td className="mono">{v.sku}</td>
                      <td>
                        {conditionLabel(v.conditionMedia) ?? "—"}
                        {" / "}
                        {conditionLabel(v.conditionSleeve) ?? "—"}
                      </td>
                      <td className="t-right mono t-ink">{formatIdr(v.priceIdr.toString())}</td>
                      <td className="t-right mono">{onHand}</td>
                      <td className="t-right mono">{reserved}</td>
                      <td>
                        {synced ? (
                          <span className="pill pill-ok">Synced</span>
                        ) : enrichable ? (
                          <span className="pill pill-warn">Pending</span>
                        ) : (
                          <span className="pill">No Discogs id</span>
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

import Link from "next/link";
import { PageShell } from "@/components/admin/PageShell";
import { prisma } from "@/lib/db";
import { formatIdr } from "@/lib/format";
import { artistsLabel } from "@/lib/catalog";
import { CoverImg } from "@/components/site/CoverImg";

export const dynamic = "force-dynamic";

function statusPill(status: string): string {
  if (status === "ACTIVE") return "pill pill-ok";
  if (status === "ARCHIVED") return "pill";
  return "pill pill-warn";
}

export default async function CatalogPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { release: true, variants: { orderBy: { priceIdr: "asc" } } },
  });

  return (
    <PageShell
      title="Catalog"
      description="Releases, merch and Discogs imports."
      actions={
        <Link href="/admin/catalog/new" className="btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New release
        </Link>
      }
    >
      {products.length === 0 ? (
        <div className="coming">No products yet. Create your first release.</div>
      ) : (
        <div className="panel">
          <div className="panel-hdr">
            <span className="panel-title">Products · {products.length}</span>
          </div>
          <div className="atable-wrap">
            <table className="atable">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Status</th>
                  <th className="t-right">Variants</th>
                  <th className="t-right">From</th>
                  <th>Slug</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const artist = p.release ? artistsLabel(p.release.artistsJson) : null;
                  const cover = p.heroImage ?? p.release?.coverUrl ?? null;
                  const cheapest = p.variants[0];
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/admin/catalog/${p.id}`} className="cell-item">
                          <div className="cell-cover">
                            <CoverImg src={cover} alt={p.title} />
                          </div>
                          <div>
                            {artist && <div className="cell-sub">{artist}</div>}
                            <div className="t-ink">{p.title}</div>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <span className={statusPill(p.status)}>{p.status.toLowerCase()}</span>
                      </td>
                      <td className="t-right mono">{p.variants.length}</td>
                      <td className="t-right mono t-ink">
                        {cheapest ? formatIdr(cheapest.priceIdr.toString()) : "—"}
                      </td>
                      <td className="mono cell-sub">{p.slug}</td>
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

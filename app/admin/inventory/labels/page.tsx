import Link from "next/link";
import { PageShell } from "@/components/admin/PageShell";
import { prisma } from "@/lib/db";
import { formatIdr } from "@/lib/format";
import { artistsLabel, conditionLabel } from "@/lib/catalog";
import { PrintButton } from "@/components/admin/PrintButton";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function LabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; copies?: string }>;
}) {
  const { product, copies } = await searchParams;
  const perVariant = Math.max(1, Math.min(10, Number(copies ?? 1) || 1));

  const where: Prisma.VariantWhereInput = product ? { productId: product } : {};
  const variants = await prisma.variant.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { product: { include: { release: true } } },
  });

  // Repeat each variant `perVariant` times for multi-copy label runs.
  const labels = variants.flatMap((v) =>
    Array.from({ length: perVariant }, (_, i) => ({ v, key: `${v.id}-${i}` })),
  );

  return (
    <PageShell
      title="Print labels"
      description={`Code-128 SKU labels · ${variants.length} variant${variants.length === 1 ? "" : "s"}`}
      actions={
        <div className="greet-right no-print">
          <Link href="/admin/inventory" className="btn-sec">← Inventory</Link>
          <PrintButton label="Print labels" />
        </div>
      }
    >
      {labels.length === 0 ? (
        <div className="coming">No variants to label.</div>
      ) : (
        <div className="label-sheet">
          {labels.map(({ v, key }) => {
            const release = v.product.release;
            const artist = release ? artistsLabel(release.artistsJson) : null;
            const code = v.internalBarcode ?? v.sku;
            return (
              <div className="label" key={key}>
                <div className="l-title">{artist ? `${artist} — ` : ""}{v.product.title}</div>
                <div className="l-sub">
                  {conditionLabel(v.conditionMedia) ?? "—"}
                  {v.conditionSleeve ? ` / ${conditionLabel(v.conditionSleeve)}` : ""}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/barcode?text=${encodeURIComponent(code)}`} alt={code} />
                <div className="l-price">{formatIdr(v.priceIdr.toString())}</div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

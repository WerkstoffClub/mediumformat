import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatIdr } from "@/lib/format";
import { artistsLabel } from "@/lib/catalog";
import { PageShell } from "@/components/admin/PageShell";

export const dynamic = "force-dynamic";

// Kick off Discogs enrichment (metadata + artwork + tracklist) and Apple Music
// media resolution for every eligible release. Runs in the background worker.
async function enrichAction() {
  "use server";
  const session = await auth();
  if (!can(session?.user?.role, "catalog.write")) {
    throw new Error("Forbidden");
  }
  // Dynamic import so the page module doesn't open a Redis connection at build.
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
      include: {
        product: { include: { release: true } },
        stock: true,
      },
    }),
    // Releases that carry a Discogs id or barcode → can be enriched.
    prisma.release.count({
      where: { OR: [{ discogsId: { not: null } }, { extBarcode: { not: null } }] },
    }),
    // Enrichable but never synced yet.
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

  return (
    <PageShell
      title="Inventory"
      description="Stock by variant, linked to the catalog. Enrich from Discogs + Apple Music."
      actions={
        <form action={enrichAction}>
          <button
            type="submit"
            disabled={eligibleCount === 0}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Enrich {eligibleCount} from Discogs + Apple Music
          </button>
        </form>
      }
    >
      {queued && (
        <div className="mb-6 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          Enrichment queued. The worker is pulling metadata, artwork, and track
          previews in the background — refresh in a moment to see it land.
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Variants (SKUs)" value={variants.length.toString()} />
        <Stat label="Units on hand" value={totalOnHand.toString()} />
        <Stat label="Enrichable releases" value={eligibleCount.toString()} />
        <Stat label="Awaiting metadata" value={missingMetaCount.toString()} />
      </div>

      {variants.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 px-6 py-16 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No variants yet. Add catalog items to see them here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Condition</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">On hand</th>
                <th className="px-4 py-3 text-right font-medium">Reserved</th>
                <th className="px-4 py-3 font-medium">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {variants.map((v) => {
                const release = v.product.release;
                const cover = v.product.heroImage ?? release?.coverUrl ?? null;
                const artist = release ? artistsLabel(release.artistsJson) : null;
                const onHand = v.stock.reduce((s, st) => s + st.onHand, 0);
                const reserved = v.stock.reduce((s, st) => s + st.reserved, 0);
                const synced = Boolean(release?.lastSyncedAt);
                const enrichable = Boolean(release?.discogsId || release?.extBarcode);

                return (
                  <tr key={v.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                          {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={cover}
                              alt={v.product.title}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          {artist && (
                            <div className="truncate text-xs text-zinc-500">{artist}</div>
                          )}
                          <div className="truncate font-medium">{v.product.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{v.sku}</td>
                    <td className="px-4 py-3 text-xs">
                      {(v.conditionMedia ?? "—")}
                      {" / "}
                      {(v.conditionSleeve ?? "—")}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {formatIdr(v.priceIdr.toString())}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{onHand}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-500">
                      {reserved}
                    </td>
                    <td className="px-4 py-3">
                      {synced ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                          Synced
                        </span>
                      ) : enrichable ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800">
                          No Discogs id
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

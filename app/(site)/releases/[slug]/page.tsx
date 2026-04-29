import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatIdr } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReleasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      release: { include: { tracks: { orderBy: { sortOrder: "asc" } } } },
      variants: true,
    },
  });
  if (!product) return notFound();

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-4 py-12 md:grid-cols-2">
      <div className="aspect-square rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{product.title}</h1>
        {product.release && (
          <p className="mt-1 text-sm text-zinc-500">
            {product.release.year} · {product.release.country}
          </p>
        )}

        <div className="mt-6 space-y-2">
          {product.variants.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800"
            >
              <span className="text-sm">
                {v.conditionMedia ?? "—"} / {v.conditionSleeve ?? "—"}
                {v.color ? ` · ${v.color}` : ""}
              </span>
              <span className="font-mono text-sm">{formatIdr(v.priceIdr.toString())}</span>
            </div>
          ))}
        </div>

        {product.release && product.release.tracks.length > 0 && (
          <section className="mt-8">
            <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-500">
              Tracklist
            </h2>
            <ol className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
              {product.release.tracks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-10 font-mono text-zinc-400">{t.position}</span>
                  <span className="flex-1">{t.title}</span>
                  {t.previewUrl ? (
                    <button className="rounded-full border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                      ▶ {t.previewSource?.toLowerCase()}
                    </button>
                  ) : (
                    <span className="font-mono text-xs text-zinc-400">—</span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}

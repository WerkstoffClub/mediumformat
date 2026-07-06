import Link from "next/link";
import { formatIdr } from "@/lib/format";
import { artistsLabel, type CatalogProduct } from "@/lib/catalog";

// A single catalog tile: cover, title, artist, and cheapest variant price.
// Uses a plain <img> (no next/image remote-domain config in this project) and
// degrades to a neutral placeholder when a release has no cover art.
export function ProductCard({ product }: { product: CatalogProduct }) {
  const cover = product.heroImage ?? product.release?.coverUrl ?? null;
  const artist = product.release ? artistsLabel(product.release.artistsJson) : null;
  const cheapest = product.variants[0];

  return (
    <Link href={`/releases/${product.slug}`} className="group block">
      <div className="aspect-square overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
          />
        ) : null}
      </div>
      <div className="mt-2">
        {artist && (
          <p className="truncate text-xs text-zinc-500">{artist}</p>
        )}
        <p className="truncate text-sm font-medium">{product.title}</p>
        {cheapest && (
          <p className="mt-0.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">
            {formatIdr(cheapest.priceIdr.toString())}
          </p>
        )}
      </div>
    </Link>
  );
}

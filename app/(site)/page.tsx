import Link from "next/link";
import { getCatalogProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/site/ProductCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getCatalogProducts(24);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section className="mb-12 rounded-lg border border-zinc-200 bg-zinc-50 p-12 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          New arrivals · Restocks · Pre-orders
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          Records, carefully selected.
        </h1>
        <p className="mt-3 max-w-prose text-zinc-600 dark:text-zinc-400">
          Independent record shop in Jakarta. New & used vinyl, CDs, cassettes, books.
          We ship across Indonesia and worldwide.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/shop"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Browse shop
          </Link>
          <Link
            href="/news"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Read news
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-500">
            In the shop
          </h2>
          <Link
            href="/shop"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            View all →
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 px-6 py-16 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No releases in the catalog yet. Check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import { getCatalogProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/site/ProductCard";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await getCatalogProducts(48);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Shop</h1>
      <p className="mt-2 text-zinc-500">Filter by format, genre, condition, price, label.</p>

      {products.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-zinc-300 px-6 py-16 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No releases in the catalog yet. Check back soon.
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

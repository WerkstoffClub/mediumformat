import { getCatalogProducts } from "@/lib/catalog";
import { ReleaseCard } from "@/components/site/ReleaseCard";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await getCatalogProducts(48);

  return (
    <div className="content">
      <div className="content-bar">
        <div className="result-count">
          <strong>{products.length}</strong> releases
        </div>
      </div>

      {products.length === 0 ? (
        <div className="empty">
          No releases in the catalogue yet. Check back soon.
        </div>
      ) : (
        <div className="grid">
          {products.map((product) => (
            <ReleaseCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

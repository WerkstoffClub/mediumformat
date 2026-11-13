import { Cover } from './ReleaseCard';

/** Small square cover for cart/checkout rows (Cover falls back to the monochrome disc). */
export function CartThumb({ imageUrl, alt }: { imageUrl: string | null; alt: string }) {
  return <div className="cart-thumb"><Cover imageUrl={imageUrl} alt={alt} small /></div>;
}

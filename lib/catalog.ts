import { prisma } from "@/lib/db";

// Shape of Release.artistsJson (cached from Discogs): [{ name }, ...].
type CatalogArtist = { name?: string | null };

// Human-readable artist credit for a release. Falls back to "Various".
export function artistsLabel(artistsJson: unknown): string {
  const arr = Array.isArray(artistsJson) ? (artistsJson as CatalogArtist[]) : [];
  const names = arr.map((a) => a?.name).filter((n): n is string => Boolean(n));
  return names.length ? names.join(", ") : "Various";
}

// Active, sellable products for the public catalog. Variants come back
// cheapest-first so the card can show a "from" price. Newest first.
export async function getCatalogProducts(limit = 24) {
  return prisma.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      release: true,
      variants: { orderBy: { priceIdr: "asc" } },
    },
  });
}

export type CatalogProduct = Awaited<
  ReturnType<typeof getCatalogProducts>
>[number];

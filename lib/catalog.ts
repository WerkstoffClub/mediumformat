import { prisma } from "@/lib/db";

// Shape of Release.artistsJson (cached from Discogs): [{ name }, ...].
type CatalogArtist = { name?: string | null };

// Human-readable artist credit for a release. Falls back to "Various".
export function artistsLabel(artistsJson: unknown): string {
  const arr = Array.isArray(artistsJson) ? (artistsJson as CatalogArtist[]) : [];
  const names = arr.map((a) => a?.name).filter((n): n is string => Boolean(n));
  return names.length ? names.join(", ") : "Various";
}

// Discogs formatsJson is [{ name, qty, descriptions }, …]. Short label for a
// card chip, e.g. "2×LP" or "LP" or "CD".
type CatalogFormat = { name?: string | null; qty?: string | null };
export function formatLabel(formatsJson: unknown): string | null {
  const arr = Array.isArray(formatsJson) ? (formatsJson as CatalogFormat[]) : [];
  const first = arr[0];
  if (!first?.name) return null;
  const qty = first.qty && Number(first.qty) > 1 ? `${first.qty}×` : "";
  return `${qty}${first.name}`;
}

// MediaCondition enum → Goldmine-style display grade.
const CONDITION_LABELS: Record<string, string> = {
  M: "M",
  NM: "NM",
  VG_PLUS: "VG+",
  VG: "VG",
  G_PLUS: "G+",
  G: "G",
  F: "F",
  P: "P",
};
export function conditionLabel(media: string | null | undefined): string | null {
  return media ? CONDITION_LABELS[media] ?? media : null;
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

// Count of active products — shown in the hero.
export function countActiveProducts() {
  return prisma.product.count({ where: { status: "ACTIVE" } });
}

// Latest published news posts for the storefront "News" strip.
export function getLatestNews(limit = 3) {
  return prisma.newsPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}

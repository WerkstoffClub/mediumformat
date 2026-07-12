import Link from "next/link";
import type { Prisma, MediaCondition } from "@prisma/client";
import { prisma } from "@/lib/db";
import { artistsLabel } from "@/lib/catalog";
import { ReleaseCard } from "@/components/site/ReleaseCard";

export const dynamic = "force-dynamic";

const CONDITIONS: { value: MediaCondition; label: string }[] = [
  { value: "M", label: "M" },
  { value: "NM", label: "NM" },
  { value: "VG_PLUS", label: "VG+" },
  { value: "VG", label: "VG" },
  { value: "G_PLUS", label: "G+" },
  { value: "G", label: "G" },
];

const PRICE_BRACKETS = [
  { value: "250000", label: "≤ Rp 250k" },
  { value: "500000", label: "≤ Rp 500k" },
  { value: "1000000", label: "≤ Rp 1jt" },
  { value: "2000000", label: "≤ Rp 2jt" },
];

const SORTS = [
  { value: "new", label: "New arrivals" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "artist", label: "Artist A–Z" },
];

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const selGenres = toArray(sp.genre);
  const selConds = toArray(sp.cond) as MediaCondition[];
  const maxPrice = sp.maxPrice ? Number(sp.maxPrice) : null;
  const sort = (Array.isArray(sp.sort) ? sp.sort[0] : sp.sort) ?? "new";
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q ?? "").trim();

  // Build the where clause from active filters.
  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };
  if (selGenres.length) where.release = { is: { genres: { hasSome: selGenres } } };
  if (q) where.title = { contains: q, mode: "insensitive" };
  const variantSome: Prisma.VariantWhereInput = {};
  if (selConds.length) variantSome.conditionMedia = { in: selConds };
  if (maxPrice) variantSome.priceIdr = { lte: maxPrice };
  if (Object.keys(variantSome).length) where.variants = { some: variantSome };

  const [rows, facetRows] = await Promise.all([
    prisma.product.findMany({
      where,
      take: 120,
      orderBy: { createdAt: "desc" },
      include: { release: true, variants: { orderBy: { priceIdr: "asc" } } },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { release: { select: { genres: true } } },
      take: 1000,
    }),
  ]);

  // Genre facet counts.
  const genreCount = new Map<string, number>();
  for (const r of facetRows) {
    for (const g of r.release?.genres ?? []) {
      genreCount.set(g, (genreCount.get(g) ?? 0) + 1);
    }
  }
  const genres = [...genreCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  // Sorts that need cross-relation data run in JS.
  const priceOf = (p: (typeof rows)[number]) =>
    p.variants[0] ? Number(p.variants[0].priceIdr.toString()) : Infinity;
  const artistOf = (p: (typeof rows)[number]) =>
    p.release ? artistsLabel(p.release.artistsJson) : p.title;

  const products = [...rows];
  if (sort === "price-asc") products.sort((a, b) => priceOf(a) - priceOf(b));
  else if (sort === "price-desc") products.sort((a, b) => priceOf(b) - priceOf(a));
  else if (sort === "artist")
    products.sort((a, b) => artistOf(a).localeCompare(artistOf(b)));

  const Check = () => (
    <span className="fcheck">
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="2,6 5,9 10,3" />
      </svg>
    </span>
  );

  return (
    <div className="layout">
      {/* Filter sidebar — a plain GET form, no JS required */}
      <form className="sidebar" method="get" action="/shop">
        {q && <input type="hidden" name="q" value={q} />}
        <div className="fsec">
          <div className="flabel">Sort by</div>
          <select className="fselect" name="sort" defaultValue={sort}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {genres.length > 0 && (
          <div className="fsec">
            <div className="flabel">Genre</div>
            {genres.map(([g, c]) => (
              <label className="fopt" key={g}>
                <input
                  type="checkbox"
                  name="genre"
                  value={g}
                  defaultChecked={selGenres.includes(g)}
                />
                <Check />
                <span className="fopt-label">{g}</span>
                <span className="fopt-count">{c}</span>
              </label>
            ))}
          </div>
        )}

        <div className="fsec">
          <div className="flabel">Condition</div>
          <div className="cond-chips">
            {CONDITIONS.map((c) => (
              <label className="cchip" key={c.value}>
                <input
                  type="checkbox"
                  name="cond"
                  value={c.value}
                  defaultChecked={selConds.includes(c.value)}
                />
                {c.label}
              </label>
            ))}
          </div>
        </div>

        <div className="fsec">
          <div className="flabel">Max price</div>
          <select className="fselect" name="maxPrice" defaultValue={maxPrice ? String(maxPrice) : ""}>
            <option value="">Any price</option>
            {PRICE_BRACKETS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        <div className="fbtns">
          <button type="submit" className="btn-primary">
            Apply filters
          </button>
          <Link href="/shop" className="btn-secondary">
            Clear all
          </Link>
        </div>
      </form>

      {/* Results */}
      <div className="content">
        <div className="content-bar">
          <div className="result-count">
            <strong>{products.length}</strong> releases
            {q && <> · “{q}”</>}
          </div>
        </div>

        {products.length === 0 ? (
          <div className="empty">
            No releases match these filters.{" "}
            <Link href="/shop" className="page-link">
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="grid">
            {products.map((product) => (
              <ReleaseCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { formatIdr } from "@/lib/format";
import { effectivePrice } from "@/lib/pricing";
import { CoverImg } from "@/components/site/CoverImg";
import {
  artistsLabel,
  formatLabel,
  conditionLabel,
  type CatalogProduct,
} from "@/lib/catalog";

// Storefront release card (monochrome v2.0). Cover art with a hover play
// affordance, artist/title, label · catno · year, format/condition/genre
// chips, and the cheapest variant price. Whole card links to the release.
export function ReleaseCard({
  product,
  wholesale = false,
}: {
  product: CatalogProduct;
  wholesale?: boolean;
}) {
  const release = product.release;
  const cover = product.heroImage ?? release?.coverUrl ?? null;
  const artist = release ? artistsLabel(release.artistsJson) : product.title;
  const cheapest = product.variants[0];
  const price = cheapest ? effectivePrice(cheapest, wholesale) : null;
  const retail = cheapest ? Number(cheapest.priceIdr.toString()) : null;
  const showRetail = wholesale && cheapest?.wholesalePriceIdr != null && retail != null;
  const hasPreview = false; // wired when track previews resolve

  const fmt = release ? formatLabel(release.formatsJson) : null;
  const cond = conditionLabel(cheapest?.conditionMedia);
  const genre = release?.genres?.[0] ?? null;

  const labelLine = release
    ? [release.catno, release.year].filter(Boolean).join(" · ")
    : null;

  return (
    <Link href={`/releases/${product.slug}`} className="rcard">
      <div className="cover">
        <CoverImg src={cover} alt={`${artist} — ${product.title}`} />
        <div className="cover-overlay">
          <span className="playbtn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </span>
        </div>
        {hasPreview && (
          <div className="preview-dot">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <span>Audio</span>
          </div>
        )}
      </div>
      <div className="rinfo">
        <div className="rartist">{artist}</div>
        <div className="rtitle">{product.title}</div>
        {labelLine && <div className="rlabel">{labelLine}</div>}
        <div className="chips">
          {fmt && <span className="chip">{fmt}</span>}
          {cond && <span className="chip cond">{cond}</span>}
          {genre && <span className="chip">{genre}</span>}
        </div>
        <div className="price-row-card">
          <span className="rprice">
            {price != null ? formatIdr(price) : "—"}
            {showRetail && (
              <span
                style={{
                  color: "var(--mute)",
                  textDecoration: "line-through",
                  marginLeft: 6,
                  fontSize: 12,
                }}
              >
                {formatIdr(retail!)}
              </span>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}

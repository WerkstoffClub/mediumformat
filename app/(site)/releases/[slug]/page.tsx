import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatIdr } from "@/lib/format";
import {
  artistsLabel,
  formatLabel,
  conditionLabel,
  getCatalogProducts,
} from "@/lib/catalog";
import { ReleaseCard } from "@/components/site/ReleaseCard";
import { CoverImg } from "@/components/site/CoverImg";
import { isWholesaleCustomer, effectivePrice } from "@/lib/pricing";
import { addToCart } from "../../cart/actions";

export const dynamic = "force-dynamic";

type Label = { name?: string | null; catno?: string | null };
function labelName(labelsJson: unknown): string | null {
  const arr = Array.isArray(labelsJson) ? (labelsJson as Label[]) : [];
  return arr[0]?.name ?? null;
}

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

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
      variants: { orderBy: { priceIdr: "asc" } },
    },
  });
  if (!product) return notFound();

  const release = product.release;
  const cover = product.heroImage ?? release?.coverUrl ?? null;
  const artist = release ? artistsLabel(release.artistsJson) : product.title;
  const cheapest = product.variants[0];
  const fmt = release ? formatLabel(release.formatsJson) : null;
  const tracks = release?.tracks ?? [];

  const wholesale = await isWholesaleCustomer();

  const related = (await getCatalogProducts(5))
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  const metaBits = release
    ? [labelName(release.labelsJson), release.catno, release.country, release.year].filter(Boolean)
    : [];

  const facts: [string, string][] = [];
  if (release) {
    if (labelName(release.labelsJson)) facts.push(["Label", labelName(release.labelsJson)!]);
    if (release.catno) facts.push(["Catalogue #", release.catno]);
    if (fmt) facts.push(["Format", fmt]);
    if (release.country) facts.push(["Country", release.country]);
    if (release.year) facts.push(["Year", String(release.year)]);
    if (release.genres?.length) facts.push(["Genre", release.genres.join(", ")]);
    if (release.styles?.length) facts.push(["Styles", release.styles.join(", ")]);
    if (release.extBarcode) facts.push(["Barcode", release.extBarcode]);
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="crumb">
        <Link href="/">Home</Link>
        <span className="sep">/</span>
        <Link href="/shop">Shop</Link>
        <span className="sep">/</span>
        <span className="cur">{artist}</span>
      </div>

      {/* Detail */}
      <div className="rd">
        <div className="rd-media">
          <div className="rd-cover">
            <CoverImg src={cover} alt={`${artist} — ${product.title}`} />
          </div>
        </div>

        <div className="rd-info">
          <div className="rd-badges">
            {product.variants.length > 0 ? (
              <span className="status-badge sb-instock">
                <span className="dot" />
                Available
              </span>
            ) : (
              <span className="status-badge sb-low">
                <span className="dot" />
                Sold out
              </span>
            )}
            {conditionLabel(cheapest?.conditionMedia) && (
              <span className="grade-pill">{conditionLabel(cheapest?.conditionMedia)}</span>
            )}
          </div>

          <h1 className="rd-artist">{artist}</h1>
          <div className="rd-title">{product.title}</div>
          {metaBits.length > 0 && <div className="rd-meta">{metaBits.join(" · ")}</div>}

          <div className="rd-chips">
            {fmt && <span className="chip">{fmt}</span>}
            {release?.genres?.map((g) => (
              <span key={g} className="chip">
                {g}
              </span>
            ))}
          </div>

          <div className="rd-price-block">
            <span className="rd-price">
              {cheapest ? formatIdr(effectivePrice(cheapest, wholesale)) : "—"}
            </span>
            {wholesale && cheapest?.wholesalePriceIdr != null && (
              <span className="rd-price-note" style={{ textDecoration: "line-through" }}>
                {formatIdr(cheapest.priceIdr.toString())}
              </span>
            )}
            {product.variants.length > 1 && (
              <span className="rd-price-note">from · {product.variants.length} copies</span>
            )}
          </div>

          {product.variants.length > 0 && (
            <div className="rd-variants">
              {product.variants.map((v) => (
                <div key={v.id} className="rd-variant">
                  <div className="rd-variant-meta">
                    <span className="grade-pill">
                      {conditionLabel(v.conditionMedia) ?? "—"}
                      {v.conditionSleeve ? ` / ${conditionLabel(v.conditionSleeve)}` : ""}
                    </span>
                    {v.color && <span>{v.color}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="rd-variant-price">{formatIdr(effectivePrice(v, wholesale))}</span>
                    <form action={addToCart}>
                      <input type="hidden" name="variantId" value={v.id} />
                      <button className="vadd" aria-label="Add this copy to cart">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rd-actions">
            {cheapest && (
              <form action={addToCart} style={{ flex: 1, display: "flex" }}>
                <input type="hidden" name="variantId" value={cheapest.id} />
                <button className="btn-primary" style={{ width: "100%" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  Add to cart
                </button>
              </form>
            )}
            <button type="button" className="btn-secondary" aria-label="Add to wishlist">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>

          {/* Tracklist — now directly under Add to cart */}
          {tracks.length > 0 && (
            <div className="tracklist">
              {tracks.map((t) => {
                const hasPreview = Boolean(t.previewUrl) && t.previewSource !== "NONE";
                return (
                  <div key={t.id} className="track">
                    <span className="tk-num">{t.position}</span>
                    <span className={`tk-play${hasPreview ? "" : " muted"}`}>
                      <PlayIcon />
                    </span>
                    <span className="tk-name">{t.title}</span>
                    <span className="tk-dur">
                      {t.durationSec
                        ? `${Math.floor(t.durationSec / 60)}:${String(t.durationSec % 60).padStart(2, "0")}`
                        : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Lower section: About this pressing (left) · Release information (right) */}
      <div className="rd-cols">
        <div>
          <h2 className="sec-h2">About this pressing</h2>
          <p className="sec-sub">Notes from the shop.</p>
          {product.descriptionMd ? (
            <div className="about-copy">{product.descriptionMd}</div>
          ) : (
            <p className="about-copy" style={{ color: "var(--mute)" }}>
              No notes for this pressing yet.
            </p>
          )}
        </div>
        <div>
          <h2 className="sec-h2">Release information</h2>
          <p className="sec-sub">Discography &amp; pressing details.</p>
          {facts.length > 0 ? (
            <div className="rd-facts">
              {facts.map(([k, v]) => (
                <div className="fact-row" key={k}>
                  <span className="fact-k">{k}</span>
                  <span className="fact-v">{v}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="sec-sub">No release metadata yet.</p>
          )}
        </div>
      </div>

      {/* You might also like */}
      {related.length > 0 && (
        <section className="rd-section rd-section-full">
          <h2 className="sec-h2">You might also like</h2>
          <p className="sec-sub">More from the shop</p>
          <div className="rec-grid">
            {related.map((p) => (
              <ReleaseCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

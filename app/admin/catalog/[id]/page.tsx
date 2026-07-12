import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatIdr } from "@/lib/format";
import { formatLabel, conditionLabel } from "@/lib/catalog";
import { PageShell } from "@/components/admin/PageShell";
import { CoverImg } from "@/components/site/CoverImg";
import {
  updateProduct,
  deleteProduct,
  addVariant,
  deleteVariant,
  uploadProductImage,
} from "../actions";

export const dynamic = "force-dynamic";

function firstArtist(json: unknown): string {
  const arr = Array.isArray(json) ? (json as { name?: string }[]) : [];
  return arr[0]?.name ?? "";
}
function firstLabel(json: unknown): { name: string; catno: string } {
  const arr = Array.isArray(json) ? (json as { name?: string; catno?: string }[]) : [];
  return { name: arr[0]?.name ?? "", catno: arr[0]?.catno ?? "" };
}

const COND_MEDIA = ["", "M", "NM", "VG_PLUS", "VG", "G_PLUS", "G", "F", "P"];
const COND_SLEEVE = ["", "M", "NM", "VG_PLUS", "VG", "G_PLUS", "G", "GENERIC", "NO_SLEEVE"];

export default async function EditReleasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      release: { include: { tracks: { orderBy: { sortOrder: "asc" } } } },
      variants: { orderBy: { priceIdr: "asc" } },
    },
  });
  if (!product) return notFound();

  const [prev, next] = await Promise.all([
    prisma.product.findFirst({
      where: { createdAt: { lt: product.createdAt } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    }),
    prisma.product.findFirst({
      where: { createdAt: { gt: product.createdAt } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
  ]);

  const r = product.release;
  const label = firstLabel(r?.labelsJson);
  const cover = product.heroImage ?? r?.coverUrl ?? null;

  return (
    <PageShell
      title="Edit release"
      description={product.title}
      actions={
        <div className="rec-nav">
          <Link href="/admin/catalog" className="rn-btn">Catalog</Link>
          <Link
            href={prev ? `/admin/catalog/${prev.id}` : "#"}
            className={`rn-btn${prev ? "" : " disabled"}`}
            aria-label="Previous release"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
            Prev
          </Link>
          <Link
            href={next ? `/admin/catalog/${next.id}` : "#"}
            className={`rn-btn${next ? "" : " disabled"}`}
            aria-label="Next release"
          >
            Next
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
          </Link>
        </div>
      }
    >
      {/* Cover upload (own form — file inputs can't nest in the edit form) */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-hdr"><span className="panel-title">Cover image</span></div>
        <div className="panel-body" style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div className="cell-cover" style={{ width: 84, height: 84 }}>
            <CoverImg src={cover} alt={product.title} />
          </div>
          <form action={uploadProductImage} className="upload">
            <input type="hidden" name="productId" value={product.id} />
            <input type="file" name="file" accept="image/*" required />
            <button className="btn-sec" type="submit">Upload cover</button>
          </form>
          <span className="cell-sub">JPG/PNG/WebP · or paste a URL in “1 · Cover” below.</span>
        </div>
      </div>

      {/* Editable fields — one form laid out as two columns (cards 1-5 left, 6 right) */}
      <form action={updateProduct} className="edit-cols">
        <input type="hidden" name="id" value={product.id} />

        {/* LEFT — cards 1-5 */}
        <div className="edit-col">
          {/* 1 · Cover */}
          <div className="panel">
            <div className="panel-hdr"><span className="panel-title">1 · Cover</span></div>
            <div className="panel-body">
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="coverUrl">Cover image URL</label>
                <input className="input" id="coverUrl" name="coverUrl" defaultValue={r?.coverUrl ?? ""} placeholder="https://… (or use Upload above)" />
              </div>
            </div>
          </div>

          {/* 2 · Release */}
          <div className="panel">
            <div className="panel-hdr"><span className="panel-title">2 · Release</span></div>
            <div className="panel-body">
              <div className="field"><label htmlFor="artist">Artist</label><input className="input" id="artist" name="artist" defaultValue={firstArtist(r?.artistsJson)} /></div>
              <div className="field"><label htmlFor="title">Title</label><input className="input" id="title" name="title" defaultValue={r?.title ?? product.title} /></div>
              <div className="form-row">
                <div className="field"><label htmlFor="year">Year</label><input className="input" id="year" name="year" defaultValue={r?.year ?? ""} inputMode="numeric" /></div>
                <div className="field"><label htmlFor="country">Country</label><input className="input" id="country" name="country" defaultValue={r?.country ?? ""} /></div>
              </div>
            </div>
          </div>

          {/* 3 · Label */}
          <div className="panel">
            <div className="panel-hdr"><span className="panel-title">3 · Label &amp; catalog</span></div>
            <div className="panel-body">
              <div className="form-row">
                <div className="field"><label htmlFor="label">Label</label><input className="input" id="label" name="label" defaultValue={label.name} /></div>
                <div className="field"><label htmlFor="catno">Catalogue #</label><input className="input" id="catno" name="catno" defaultValue={label.catno || (r?.catno ?? "")} /></div>
              </div>
              <div className="field"><label htmlFor="barcode">Barcode</label><input className="input" id="barcode" name="barcode" defaultValue={r?.extBarcode ?? ""} /></div>
            </div>
          </div>

          {/* 4 · Genres */}
          <div className="panel">
            <div className="panel-hdr"><span className="panel-title">4 · Genres &amp; styles</span></div>
            <div className="panel-body">
              <div className="field"><label htmlFor="genres">Genres (comma-separated)</label><input className="input" id="genres" name="genres" defaultValue={(r?.genres ?? []).join(", ")} /></div>
              <div className="field"><label htmlFor="styles">Styles (comma-separated)</label><input className="input" id="styles" name="styles" defaultValue={(r?.styles ?? []).join(", ")} /></div>
            </div>
          </div>

          {/* 5 · Format */}
          <div className="panel">
            <div className="panel-hdr"><span className="panel-title">5 · Format &amp; Discogs</span></div>
            <div className="panel-body">
              <div className="form-row">
                <div className="field"><label htmlFor="format">Format</label><input className="input" id="format" name="format" defaultValue={r ? formatLabel(r.formatsJson) ?? "" : ""} /></div>
                <div className="field"><label htmlFor="discogsId">Discogs id</label><input className="input" id="discogsId" name="discogsId" defaultValue={r?.discogsId ?? ""} inputMode="numeric" /></div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — card 6 (Product) + save */}
        <div className="edit-col">
          <div className="panel">
            <div className="panel-hdr"><span className="panel-title">6 · Product</span></div>
            <div className="panel-body">
              <div className="field"><label htmlFor="slug">Slug</label><input className="input" id="slug" name="slug" defaultValue={product.slug} /><div className="field-hint">Public URL: /releases/&lt;slug&gt;</div></div>
              <div className="field">
                <label htmlFor="status">Status</label>
                <select className="select" id="status" name="status" defaultValue={product.status}>
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active (visible in shop)</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div className="field"><label htmlFor="description">About this pressing</label><textarea className="textarea" id="description" name="description" defaultValue={product.descriptionMd ?? ""} style={{ minHeight: 140 }} /></div>
            </div>
          </div>
        </div>

        <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
          <button type="submit" className="btn-primary">Save changes</button>
          {product.status === "ACTIVE" && (
            <Link href={`/releases/${product.slug}`} className="btn-sec" target="_blank">
              View on site
            </Link>
          )}
        </div>
      </form>

      {/* Cards 7-9 */}
      <div className="edit-cols" style={{ marginTop: 16 }}>
        {/* 7 · Variants */}
        <div className="edit-col">
          <div className="panel">
            <div className="panel-hdr"><span className="panel-title">7 · Copies (variants)</span></div>
            <div className="panel-body">
              {product.variants.length === 0 && (
                <p className="cell-sub" style={{ marginBottom: 12 }}>No copies yet.</p>
              )}
              {product.variants.map((v) => (
                <div className="kv" key={v.id}>
                  <span className="k">
                    <span className="mono">{v.sku}</span> ·{" "}
                    {conditionLabel(v.conditionMedia) ?? "—"}
                    {v.conditionSleeve ? ` / ${conditionLabel(v.conditionSleeve)}` : ""}
                  </span>
                  <span className="v" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span className="mono">{formatIdr(v.priceIdr.toString())}</span>
                    <form action={deleteVariant}>
                      <input type="hidden" name="id" value={v.id} />
                      <input type="hidden" name="productId" value={product.id} />
                      <button className="link-danger" type="submit">Remove</button>
                    </form>
                  </span>
                </div>
              ))}

              <form action={addVariant} style={{ marginTop: 14 }}>
                <input type="hidden" name="productId" value={product.id} />
                <div className="vrow">
                  <div className="field-mini">
                    <label>SKU</label>
                    <input className="input" name="sku" required />
                  </div>
                  <div className="field-mini">
                    <label>Price (IDR)</label>
                    <input className="input" name="priceIdr" inputMode="numeric" required />
                  </div>
                  <button type="submit" className="btn-sec">Add</button>
                </div>
                <div className="vrow" style={{ borderBottom: "none" }}>
                  <div className="field-mini">
                    <label>Media</label>
                    <select className="select" name="conditionMedia" defaultValue="">
                      {COND_MEDIA.map((c) => (
                        <option key={c} value={c}>{c ? conditionLabel(c) : "—"}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field-mini">
                    <label>Sleeve</label>
                    <select className="select" name="conditionSleeve" defaultValue="">
                      {COND_SLEEVE.map((c) => (
                        <option key={c} value={c}>{c ? conditionLabel(c) : "—"}</option>
                      ))}
                    </select>
                  </div>
                  <span />
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* 8 · Tracklist + 9 · Danger */}
        <div className="edit-col">
          <div className="panel">
            <div className="panel-hdr"><span className="panel-title">8 · Tracklist</span></div>
            <div className="panel-body">
              {r && r.tracks.length > 0 ? (
                r.tracks.map((t) => (
                  <div className="kv" key={t.id}>
                    <span className="k">
                      <span className="mono">{t.position}</span> {t.title}
                    </span>
                    <span className="v mono">
                      {t.durationSec
                        ? `${Math.floor(t.durationSec / 60)}:${String(t.durationSec % 60).padStart(2, "0")}`
                        : "—"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="cell-sub">
                  No tracks. Set a Discogs id and run enrichment from Inventory.
                </p>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-hdr"><span className="panel-title">9 · Danger zone</span></div>
            <div className="panel-body">
              <p className="cell-sub" style={{ marginBottom: 12 }}>
                Deleting removes the product and its copies. The release metadata is kept.
              </p>
              <form action={deleteProduct}>
                <input type="hidden" name="id" value={product.id} />
                <button className="btn-danger" type="submit">Delete product</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

import { PageShell } from "@/components/admin/PageShell";
import { createProduct } from "../actions";

export const dynamic = "force-dynamic";

export default function NewReleasePage() {
  return (
    <PageShell title="New release" description="Create a release; it appears in the shop once Active.">
      <form action={createProduct} className="editor" style={{ maxWidth: 760 }}>
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-hdr"><span className="panel-title">Release</span></div>
          <div className="panel-body">
            <div className="form-row">
              <div className="field">
                <label htmlFor="artist">Artist *</label>
                <input className="input" id="artist" name="artist" required />
              </div>
              <div className="field">
                <label htmlFor="title">Title *</label>
                <input className="input" id="title" name="title" required />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="label">Label</label>
                <input className="input" id="label" name="label" />
              </div>
              <div className="field">
                <label htmlFor="catno">Catalogue #</label>
                <input className="input" id="catno" name="catno" />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="year">Year</label>
                <input className="input" id="year" name="year" inputMode="numeric" />
              </div>
              <div className="field">
                <label htmlFor="country">Country</label>
                <input className="input" id="country" name="country" />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="genres">Genres (comma-separated)</label>
                <input className="input" id="genres" name="genres" placeholder="Electronic, Jazz" />
              </div>
              <div className="field">
                <label htmlFor="styles">Styles (comma-separated)</label>
                <input className="input" id="styles" name="styles" placeholder="Ambient, Fusion" />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="format">Format</label>
                <input className="input" id="format" name="format" placeholder="LP, CD, Cassette" />
              </div>
              <div className="field">
                <label htmlFor="barcode">Barcode</label>
                <input className="input" id="barcode" name="barcode" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="coverUrl">Cover image URL</label>
              <input className="input" id="coverUrl" name="coverUrl" placeholder="https://…" />
            </div>
            <div className="field">
              <label htmlFor="discogsId">Discogs release id (optional, for enrichment)</label>
              <input className="input" id="discogsId" name="discogsId" inputMode="numeric" />
            </div>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-hdr"><span className="panel-title">First copy (variant)</span></div>
          <div className="panel-body">
            <div className="form-row">
              <div className="field">
                <label htmlFor="sku">SKU</label>
                <input className="input" id="sku" name="sku" placeholder="MF-000123" />
              </div>
              <div className="field">
                <label htmlFor="priceIdr">Price (IDR)</label>
                <input className="input" id="priceIdr" name="priceIdr" inputMode="numeric" />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="conditionMedia">Media condition</label>
                <select className="select" id="conditionMedia" name="conditionMedia" defaultValue="">
                  <option value="">—</option>
                  <option value="M">M</option>
                  <option value="NM">NM</option>
                  <option value="VG_PLUS">VG+</option>
                  <option value="VG">VG</option>
                  <option value="G_PLUS">G+</option>
                  <option value="G">G</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="conditionSleeve">Sleeve condition</label>
                <select className="select" id="conditionSleeve" name="conditionSleeve" defaultValue="">
                  <option value="">—</option>
                  <option value="M">M</option>
                  <option value="NM">NM</option>
                  <option value="VG_PLUS">VG+</option>
                  <option value="VG">VG</option>
                  <option value="GENERIC">Generic</option>
                  <option value="NO_SLEEVE">No sleeve</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="status">Status</label>
              <select className="select" id="status" name="status" defaultValue="DRAFT">
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active (visible in shop)</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">Create release</button>
          <a href="/admin/catalog" className="btn-sec">Cancel</a>
        </div>
      </form>
    </PageShell>
  );
}

# Back-office storefront modules + release-edit integrations — design

**Date:** 2026-07-12
**Branch:** `claude/backoffice-storefront-modules-07919a`
**Status:** approved (design phase)

## Purpose

Bring the placeholder back-office modules (Preorders, Vouchers, Newsletter) to real-data parity with the HTML prototypes, upgrade Purchase Orders from read-only DealPOS mirror to an editable canonical record and promote it to the main sidebar entry, expose public storefront read APIs for a future storefront app to consume, and add Discogs + streaming-service integrations to the Release editor so cover art, weights, tracklists, and per-track previews can be pulled from external sources instead of hand-typed.

Storefront work in this pass is **API-only**. No storefront React app is scaffolded. The public endpoints are shaped so the existing HTML mockups (or a later app) can render real records.

## Success criteria

1. Preorders, Vouchers, Newsletter back-office pages ship with real database-backed CRUD flows that match their HTML prototypes.
2. Purchase Orders becomes an editable module. DealPOS remains the initial source but does not overwrite POs once they leave DRAFT. Purchase Orders sits **above** Inventory in the sidebar.
3. Blog remains unchanged but gains a public read endpoint.
4. Storefront-facing endpoints (releases, preorders, posts, newsletter subscribe, voucher validate) are reachable without auth at `/api/v1/storefront/*` and `/api/v1/storefront/newsletter/subscribe` / `/api/v1/storefront/vouchers/validate`.
5. Release editor is centered (940 px) and matches the prototype's section layout.
6. Release editor has a `Get details` action that fetches Discogs data and merges it into the form non-destructively via a confirmation modal.
7. Release editor has a `Get media` action that fetches Discogs images, lets the operator pick a cover and optional gallery items, and re-hosts them on our storage.
8. Each track row has a preview affordance supporting six sources: Apple Music, Spotify, YouTube, Bandcamp, SoundCloud, and manual audio upload. Each source is populated via either a fetch-from-API path or a paste-link path (upload is upload-only).
9. A batch "Fetch all previews from …" action on the tracks list runs a chosen source across every track.

## Scope

**In scope**
- Prisma schema additions and one migration
- New NestJS modules: `vouchers`, `newsletter`, `preorders`, `purchase-orders`, `storefront` (public), `integrations/discogs`, `integrations/apple`, `integrations/spotify`, `integrations/youtube`, `integrations/bandcamp`, `integrations/upload`
- Back-office React pages: Preorders, Vouchers, Newsletter (subscribers + campaigns), Purchase Orders (list + editable drawer)
- Rewrite of `ReleaseForm.tsx` to match the centered prototype layout, add the two panel-level fetch actions, and rebuild the tracks list with the per-track preview popover
- Reorder of the AppShell sidebar to promote Purchase Orders above Inventory
- Data-flow adjustment so DealPOS sync seeds new POs without clobbering edits

**Out of scope**
- New storefront React app
- Server-driven email delivery (Newsletter "send now" button ships as a disabled stub)
- Voucher redemption on real orders (POST validate returns the discount amount, but nothing wires it into checkout yet)
- SoundCloud auto-search (users paste links; a Cheerio scrape fallback is a nice-to-have but not required)
- Any changes to the DealPOS `Bill` mirror model

## Data model

One migration adds five models and one column.

### `PurchaseOrder`

Editable canonical PO. `sourceBillId` links back to the DealPOS `Bill` that seeded it (nullable — POs can also be created blank in the app).

- `id`, `poNumber` (unique, human-facing e.g. `PO-124`)
- `supplierId?` (soft link — DealPOS supplier IDs are strings from the mirror; kept nullable), `supplierName` (denormalized for orphan safety)
- `status: PoStatus` — DRAFT | SENT | PARTIAL | RECEIVED | CANCELLED
- `currency` (default "IDR"), `subtotalIdr`, `taxIdr`, `totalIdr`
- `orderedAt?`, `etaAt?`, `receivedAt?`
- `notes?`
- `sourceBillId?` (unique)
- `createdAt`, `updatedAt`
- Relation: `lines: PurchaseOrderLine[]`
- Index on `(status, etaAt)` for pipeline queries

### `PurchaseOrderLine`

- `id`, `purchaseOrderId` (relation), `releaseId?` (soft link to `Release`)
- `description`, `qtyOrdered`, `qtyReceived` (default 0), `unitCostIdr`, `totalIdr`

### `Voucher`

- `id`, `code` (unique, uppercased on save)
- `kind: VoucherKind` — PERCENT | FIXED_IDR
- `value` (int; percent 0–100 or IDR amount)
- `minOrderIdr` (default 0)
- `startsAt?`, `expiresAt?`
- `usageLimit?` (null = unlimited), `usageCount` (default 0)
- `active` (default true), `notes?`
- `createdAt`, `updatedAt`
- Index on `(active, expiresAt)`

### `NewsletterSubscriber`

- `id`, `email` (unique, lowercased), `name?`
- `source: NewsletterSource` — STOREFRONT | CHECKOUT | POS | MANUAL | IMPORT
- `subscribedAt`, `unsubscribedAt?`
- `tags: String[]` (Postgres text array)

### `NewsletterCampaign`

- `id`, `subject`, `previewText?`, `body` (markdown)
- `status: CampaignStatus` — DRAFT | SCHEDULED | SENT
- `scheduledFor?`, `sentAt?`, `recipientCount` (default 0)
- `createdAt`, `updatedAt`

### `Release` — one added column

- `gallery: Json?` — string array of extra media URLs (secondary cover art from Discogs, back covers, insert scans). `imageUrl` remains the primary cover for compatibility.

### Existing fields reused

- Preorders use `Release.preorder` (Boolean) and `Release.preorderEta` (DateTime?) — no new columns.
- `Release.tracks` (existing Json?) gets a new shape convention, documented but not enforced by the schema (see *Track shape* below).

### Track shape (convention inside `Release.tracks` Json)

```
{ position: string, title: string, duration?: string,
  previews: {
    apple?:      string,                       // 30-sec preview URL
    spotify?:    { id: string, previewUrl?: string },
    youtube?:    { id: string, title?: string },
    bandcamp?:   string,                       // track page URL, embed via iframe
    soundcloud?: string,                       // track page URL
    upload?:     string                        // our storage URL
  }
}
```

## API surface

### Back-office (JWT + roles)

- `purchase-orders/` — `GET /purchase-orders` (list, filter, paginate), `GET /purchase-orders/:id`, `POST /purchase-orders`, `PATCH /purchase-orders/:id`, `POST /purchase-orders/:id/receive` (per-line qty), `POST /purchase-orders/:id/cancel`, `POST /purchase-orders/sync-from-dealpos` (upserts DRAFTs from unlinked Bills)
- `preorders/` — `GET /preorders` (Releases where `preorder=true`), `POST /preorders/:releaseId` body `{ eta, notes? }`, `DELETE /preorders/:releaseId`
- `vouchers/` — `GET /vouchers`, `POST /vouchers`, `PATCH /vouchers/:id`, `DELETE /vouchers/:id` (soft-delete when `usageCount > 0`)
- `newsletter/subscribers` — `GET`, `POST`, `PATCH /:id`, `DELETE /:id`, `POST /import` (CSV), `GET /export.csv`
- `newsletter/campaigns` — `GET`, `POST`, `PATCH /:id`, `POST /:id/duplicate`, `DELETE /:id` (send stays stubbed)
- `integrations/discogs/lookup` — body `{ discogsId? | (artist,title) }` → `{ artist, title, label?, catNumber?, year?, country?, format?, weightGrams?, dimensionsMm?, tracks[], images[] }`
- `integrations/apple/search` — body `{ artist, title }` → top 3 with `{ trackName, artistName, previewUrl, artworkUrl100 }`
- `integrations/spotify/search` — body `{ artist, title }` → top 3 with `{ id, name, previewUrl }`
- `integrations/youtube/search` — body `{ artist, title }` → top 3 with `{ id, title, thumbnail }`
- `integrations/bandcamp/search` — body `{ artist, title }` → `{ searchUrl, guessedTrackUrl? }` (Cheerio best-effort; may return only the search URL)
- `integrations/upload/audio` — multipart (mp3, m4a, ≤ 20 MB) → `{ url }`

### Public (no auth, prefixed `/storefront`)

- `GET /storefront/releases` (published catalog view, paginated)
- `GET /storefront/releases/:slug`
- `GET /storefront/preorders`
- `GET /storefront/posts` (status = PUBLISHED only)
- `GET /storefront/posts/:slug`
- `POST /storefront/newsletter/subscribe` body `{ email, name?, source? }`
- `POST /storefront/vouchers/validate` body `{ code, subtotalIdr }` → `{ valid: boolean, discountIdr: number, reason?: string }`

Rate-limit the public endpoints via a global throttler guard (60 req/min per IP is enough for this stage).

## DealPOS-to-PO data flow

1. Existing DealPOS sync stays untouched; it continues to upsert `Bill` and `BillLine` records.
2. New `PurchaseOrder` sync-from-DealPOS job walks `Bill` rows without a `PurchaseOrder.sourceBillId` match and inserts a new PO with `status = DRAFT`, copying supplier and lines. Totals recomputed from lines.
3. Once a PO leaves DRAFT (i.e. status changes to SENT/PARTIAL/RECEIVED/CANCELLED), sync ignores it. The drawer shows a `Refresh from DealPOS` button that opens a confirmation with a diff summary; it never runs automatically.
4. If a `Bill` linked to a non-DRAFT PO is deleted or overwritten in DealPOS, we log a warning but do not mutate our PO. This is intentional: DealPOS is the initial source, not the ongoing source of truth.

## Back-office UI

### Sidebar order (AppShell)

```
Dashboard · Sales · POS · Preorders · Purchase Orders · Inventory
Orders · Customers · Vouchers · Newsletter · Blog
Config: Channels · Preferences
```

Purchase Orders moves above Inventory. Preorders is grouped with the sales-facing modules.

### Purchase Orders (`/purchase-orders`)

- KPI strip: Open POs · Partially received · Received this month · Value on order (IDR)
- Toolbar: status pill filter · supplier search · `Sync from DealPOS` · `New PO`
- Table: PO # · Supplier · Ordered · ETA · Items · Value · Status · row actions (Edit / Receive / Cancel)
- Edit drawer: header with status pill and `sourceBillId` deep link; supplier picker; ordered / ETA / notes; lines editor (add/remove rows, autocomplete Release, live totals); footer actions Save draft · Send · Mark received · Cancel PO
- Data flow rule (from above) reflected in the drawer's "Refresh from DealPOS" warning copy

### Preorders (`/preorders`)

- KPI strip: Active preorders · Expected this month · Total preorder units · Preorder revenue committed
- Toolbar: artist/title search · filter (All / Upcoming / Overdue) · `Add preorder`
- Table: cover · Artist – Title · Format · Price · ETA · Days to ETA · Stock committed · row actions (Edit ETA / Remove preorder / Open release)
- Add-preorder flow: release autocomplete → ETA date → notes → save (flips `preorder=true`, sets `preorderEta`)

### Vouchers (`/vouchers`)

- KPI strip: Active · Redeemed this month · Total discount given (IDR) · Expiring in 7 days
- Toolbar: code search · status filter (Active / Scheduled / Expired / Disabled) · `New voucher`
- Table: Code · Kind · Value · Min. order · Usage · Starts · Expires · Status · row actions
- Drawer: code (with auto-generate button) · kind toggle · value · min. order IDR · starts / expires datetimes · usage limit · active toggle · notes · Save
- Delete guard: hard delete only if `usageCount === 0`; otherwise "Disable" (sets `active=false`)

### Newsletter (`/newsletter`)

Two tabs: Subscribers · Campaigns.

Subscribers tab:
- KPI strip: Total · New this month · Active · Unsubscribed
- Toolbar: email search · source filter · tag filter · `Add subscriber` · `Import CSV` · `Export CSV`
- Table: Email · Name · Source · Tags · Subscribed · Status · row actions

Campaigns tab:
- KPI strip: Draft · Scheduled · Sent · Avg. recipients
- Toolbar: subject search · status filter · `New campaign`
- Table: Subject · Status · Recipients · Scheduled/Sent · row actions
- Drawer: subject · preview text · body (markdown) · scheduled-for · Save draft · Schedule
- "Send now" ships **disabled**, tooltipped "Email provider not connected (Resend / Mailchimp)"

### Blog (`/blog`)

No structural change. Each PUBLISHED post row gets a "View on storefront" link opening `/api/v1/storefront/posts/:slug` (JSON for now; renders in future storefront app).

## Release-edit form

### Layout

- Wrapper: `max-width: 940px; margin: 0 auto;` to match the prototype (`.form-wrap`)
- Vertical stack of numbered panel-header sections in prototype order: Basics · Format & condition · Pricing · Stock & location · Channels · Media · Description · SEO · Merchandising
- Sticky save/cancel footer

### Basics section — `Get details` action

Button sits on the right of the Basics panel header.

Flow:
1. If `discogsId` is set → fetch `/integrations/discogs/lookup?id=…`.
2. Else open a popover with two fields (Discogs ID / Artist + Title) and a `Search Discogs` button; on search, show top 5 matches; user picks one.
3. Open an **Apply from Discogs** modal with checkboxed rows:
   - Cat # · Year · Country · Label
   - Format (mapped into the `RecordFormat` enum; the mapping is documented in `discogs.mapper.ts`)
   - Weight (parsed from Discogs format quantity, e.g. "180 Gram" → 180 g × disc count when applicable)
   - Dimensions (checkbox disabled with the hint "Discogs did not return this — enter manually" unless present in the payload)
   - Tracklist (position, title, duration)
4. On confirm, merged into form state. Nothing overwrites unchecked rows. `discogsId` is stamped onto the release.

Non-destructive rule is stated in copy inside the modal header.

### Media section — `Get media` action

Button on the right of the Media panel header.

Flow:
1. Requires `discogsId` (opens the Discogs popover first if missing).
2. Fetches `/integrations/discogs/lookup?id=…&include=images`.
3. Opens a **Choose cover art** gallery modal — grid of thumbnails; primary marked; secondaries follow. Each thumbnail carries a best-guess label ("Sleeve · front", "Sleeve · back", "Disc", "Insert") derived from Discogs `type: primary/secondary` and the release format.
4. User picks one as cover; optionally toggles others into gallery.
5. Server side downloads and re-hosts to `/uploads` (dev) or S3 (when `AWS_S3_BUCKET` is set) to avoid Discogs hotlink cache pain. Response URLs are ours, not Discogs's.

### Media section — tracks list

Track row shape: `[≡ drag]  A1  Title  Duration  ▶ Preview [source pills]  ⋯`

Coloured dots on the row indicate which of the six preview sources are populated.

Per-track affordance opens a **Preview source popover** with six tabs:

| Tab | Fetch-from-API path | Paste-link path |
|---|---|---|
| Apple | Search iTunes by artist + title; top 3; pick one → stores `previewUrl` | Paste an iTunes/Apple Music URL |
| Spotify | Search Spotify (client-credentials); top 3; pick one → stores `{id, previewUrl?}` | Paste a Spotify track URL / URI |
| YouTube | Search YouTube Data API; top 3 with thumbnail; pick one → stores `{id, title}` | Paste a YouTube URL |
| Bandcamp | Best-effort Cheerio search returning a search URL and a guessed first result | Paste a Bandcamp track URL |
| SoundCloud | (no auto-search) | Paste a SoundCloud track URL |
| Upload | Dropzone (mp3 / m4a, ≤ 20 MB) → uploads and returns URL | n/a |

Playback in the form: `▶` plays whichever preview is present. Preference: Apple → Spotify → Upload → embed player for YouTube / Bandcamp / SoundCloud. Order is hard-coded for now.

**Batch action** — above the tracks list, a `Fetch all previews from …` menu offers Apple / Spotify / YouTube. Runs sequentially per track, populates hits, skips misses, shows a per-track status column while running.

### Cross-cutting UX rules

- All fetch buttons show a spinner and disable while pending.
- All errors surface as toasts; the modal itself explains the failure.
- All external calls are proxied through the NestJS backend. No client-side API keys.
- Autofill modals emphasize "nothing is applied until you confirm" in copy.
- Existing manual dropzone stays as a fallback path — users can still upload cover art directly without touching Discogs.

## Configuration

New env vars (all optional, features degrade gracefully if unset):

- `DISCOGS_TOKEN` — personal access token (Discogs allows unauthenticated at a lower rate limit, so unset is OK for local)
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` — client-credentials flow
- `YOUTUBE_API_KEY` — YouTube Data API v3 key
- `AWS_S3_BUCKET`, `AWS_S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` — if unset, uploads land in `apps/api/uploads/` and are served by NestJS static

iTunes Search API and Bandcamp scrape need no auth.

Each integration service checks for its keys at bootstrap; missing keys make the corresponding endpoint return a 501 with a message like "Spotify integration not configured — set SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET". The back-office popover tab renders the message inline so the operator knows why the fetch tab is inert.

## Migrations and back-fill

- One Prisma migration (`add_backoffice_modules`) adds `PurchaseOrder`, `PurchaseOrderLine`, `Voucher`, `NewsletterSubscriber`, `NewsletterCampaign`, `Release.gallery`, and the five enums (`PoStatus`, `VoucherKind`, `NewsletterSource`, `CampaignStatus`).
- A one-shot back-fill script (`prisma/scripts/backfill-purchase-orders.ts`) walks existing DealPOS `Bill` rows and creates DRAFT POs. Idempotent via `sourceBillId`.
- Seed script gains a small demo dataset for local dev: a handful of vouchers, subscribers, and one draft campaign.

## Testing

- Unit tests for `discogs.mapper.ts` covering the format-string → RecordFormat and format-quantity → weight mappings (fixture files under `apps/api/test/fixtures/discogs/`).
- Unit tests for the Voucher validator (percent vs fixed, min-order gate, expiry, usage limit, active flag).
- Integration tests for the storefront public endpoints — 200 for happy paths, 404 for unknown slugs, 400 for invalid subscribe payloads.
- Integration test for the DealPOS-to-PO sync path: seeds a `Bill`, runs the sync job, asserts a DRAFT PO is created with matching lines and totals; a second run does not duplicate; if the PO is bumped to SENT, a third run leaves it alone.
- React tests (Vitest + RTL) for: Purchase Orders drawer save + line editor; Vouchers create with each kind; Newsletter subscribers list filter; Preview popover tab switching and each fetch/paste path.

## Risks and open items

- Discogs weight/dimension coverage is uneven. Expected: weight is often derivable from format ("180 Gram"), dimensions rarely are. Acceptable per the "best effort" rule.
- Spotify client-credentials cannot fetch preview URLs for tracks that don't have a preview in Spotify's data — the response `previewUrl` may be null. The UI shows the source as populated (track id) but the play button falls back to the embed player.
- YouTube quota (10 k units/day default) is enough for admin lookups but a batch "fetch all previews" on a very large tracklist could add up — we sequence per track and stop on quota errors.
- Bandcamp scraping is fragile; if it breaks we still offer the paste-link path and the Bandcamp search URL as a fallback.
- Newsletter "send" is intentionally stubbed. When we wire Resend / Mailchimp later, no schema change is needed.

## Notes on convention

- Every new mutation returns the updated record so client caches (React Query) can update in place.
- All filters and tabs are URL-persisted (`?tab=…&status=…`) per the CLAUDE.md convention already used by Sales and Inventory.
- Every new page ships light and dark theme with no color other than DS neutrals + status.
- Panel-header bars follow the v2.1 `.mf-panel-hdr` recipe.

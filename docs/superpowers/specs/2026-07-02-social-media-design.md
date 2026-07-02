# Social Media (Meta catalog + WhatsApp Buy-Now) — Design

**Date:** 2026-07-02 · **Status:** Approved by user

## Goal

A back-office **Social Media** feature (sidebar: new **Marketing** group with
Newsletter) that gets the shop's products listed and kept up to date on
**Facebook Shop**, **Instagram** (product tags), and **WhatsApp Business** —
with "Buy Now" resolving to a prefilled WhatsApp chat, which is how Indonesian
record buyers actually purchase.

## Decisions (from user)

- **Feed URL** integration: the API serves a Meta Commerce Catalog product feed;
  Commerce Manager pulls it on a schedule. No Graph API, no app review, no tokens.
- **Buy Now → WhatsApp** deep link (`wa.me`) with a prefilled message; Instagram
  native checkout is US-only and out of scope.
- User's current Meta assets: **Instagram Business account only** — the feature
  includes a one-time setup guide for the rest (Business Manager, FB Page,
  Commerce Manager catalog, WhatsApp Business app).
- Sidebar: labelled **Marketing** group (like Config) containing Newsletter +
  Social Media.

## Architecture

### API — `apps/api/src/social/`

- **`SocialSettings`** Prisma model (single row, id=1): `waPhone`, `waTemplate`
  (default "Hi Medium Format! I'd like to buy *{title}* ({price}). Is it still
  available?"), `igUsername`, `fbPageUrl`, `storefrontUrlBase` (null until the
  real storefront ships), `feedEnabled` (default true).
- **`social.util.ts`** — pure, unit-tested functions:
  - `normalizeWaPhone` (strip `+`/spaces/dashes, `0…` → `62…`),
  - `buildWaLink(phone, template, {artist,title,price})` → encoded `wa.me` URL,
  - `releaseToFeedRow(release, settings)` → Meta catalog columns
    (`id` = release id, `title` "Artist – Title", `description` from
    format/genre/label/cat#, `availability` from stock, `condition`
    M→`new` else `used`, `price` "550000 IDR", `link` = storefront URL if
    `storefrontUrlBase` set else the wa.me link, `image_link`, `brand` = label).
- **`social.service.ts`** — settings get/update (upsert row 1); `listings()` =
  feed rows + per-item warnings (no image, zero price, out of stock);
  `feedCsv()` = in-stock rows serialised with the shared `toCsv`.
- **`social.controller.ts`** (ADMIN/MANAGER): `GET/PATCH /social/settings`
  (response includes `feedPath` so the UI can show the full URL), `GET
  /social/listings`.
- **`public-feed.controller.ts`** (no auth): `GET /public/meta-feed/:token` →
  `text/csv`. Token must equal `SOCIAL_FEED_TOKEN` env var (generated once,
  stored in root `.env`); wrong token or `feedEnabled=false` → 404.

### Back-office — `/social` page

- **Settings card** — WA number, message template (with `{artist}/{title}/{price}`
  placeholders), IG handle, FB Page URL, feed toggle; save via PATCH.
- **Feed card** — copyable feed URL, exported item count, warning list.
- **Listings table** — what the feed exports (title, price, stock, condition,
  warnings), row action "Preview WhatsApp" opening the wa.me link.
- **Setup guide card** — numbered one-time checklist: Business Manager → FB Page
  → link IG → Commerce Manager catalog → add data feed URL (hourly) → enable IG
  Shopping → WhatsApp Business app + catalog connect.
- Sidebar: `Marketing` group = Newsletter (existing stub link) + Social Media.

## Error handling

- Feed endpoint never 500s on bad rows: rows that throw during mapping are
  skipped and logged.
- Settings PATCH validates phone (digits after normalisation) and URLs.
- UI shows inline save errors and copes with empty inventory (0-item feed is
  valid — Meta just ingests nothing).

## Testing

- Unit: `normalizeWaPhone`, `buildWaLink` (encoding + placeholders),
  `releaseToFeedRow` (condition/availability/price/link fallbacks).
- Smoke: boot API, fetch feed with right/wrong token, PATCH settings.

## Out of scope (YAGNI)

Graph API catalog push, auto-posting to feeds/stories, DM automation, WhatsApp
Cloud API, per-channel analytics. Data prerequisite: inventory comes from the
DealPOS sync — feed lists nothing until the corrected client secret arrives and
the first clone runs.

# Channels

A **Channel** is anywhere we sell — five rows in `Channel`:

| id | type | seeded enabled |
|---|---|---|
| `ch-website` | `WEBSITE` | ✅ |
| `ch-pos` | `POS` | ✅ |
| `ch-discogs` | `DISCOGS` | ✅ |
| `ch-tokopedia` | `TOKOPEDIA` | ❌ (MVP-3) |
| `ch-shopee` | `SHOPEE` | ❌ (MVP-4) |

`/admin/channels` lets staff toggle channels and audit listings.

## ChannelListing

The Cartesian join Variant × Channel — but sparse: only created when we want
to list a copy somewhere.

| Column | Notes |
|---|---|
| `externalId` | marketplace listing id (Discogs listing id, Tokopedia product id…) |
| `status` | `DRAFT`, `FOR_SALE`, `SOLD`, `SUSPENDED`, `DELETED`, `ERROR` |
| `priceOverrideIdr` | per-channel price override (Discogs often higher than website) |
| `commentsText` | free text shown on the marketplace listing |
| `allowOffers` / `minOfferIdr` | Discogs offers |
| `lastOutboundSyncAt` | last time we pushed to the marketplace |
| `lastInboundSyncAt` | last time the marketplace told us about this listing |
| `syncError` | last error from a `channel-sync` job |
| `rawJson` | raw marketplace payload for debugging |

`@@unique([variantId, channelId])` — at most one listing per (variant, channel).

## Sync model

- **Outbound** (us → marketplace): producer `/admin/catalog` and `/admin/channels`
  → BullMQ `channel-sync` queue → `syncChannelListing` handler.
- **Inbound** (marketplace → us): webhook (`/api/webhooks/discogs|tokopedia|shopee`)
  + scheduled poll (`pollDiscogsOrders` etc.) → updates `ChannelListing` and
  creates `Order`s.

See [[02-Architecture/Background Jobs]].

## Per-channel quirks

### Discogs
- Currency forced via `DISCOGS_MARKETPLACE_CURRENCY` (default `IDR`).
- Listings carry `condition`, `sleeve_condition`, `comments`, `allow_offers`.
- Inbound orders include the buyer's Discogs username — match against
  `CustomerProfile` by email when possible.

### Tokopedia
- Catalog requires their category tree IDs (mapped in `configJson` on `Channel`).
- Photos must be ≤ 10 per listing; we upload from `Product.heroImage` +
  whatever lives in `public/uploads/`.

### Shopee
- HMAC-signed requests; clock skew matters.
- Categories use Shopee's own taxonomy.

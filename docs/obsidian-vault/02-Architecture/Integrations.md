# Integrations

All clients live in `lib/integrations/<service>/client.ts`. They're thin
wrappers — auth, base URL, typed request helpers — not full SDKs.

## Discogs

- **Auth**: Personal Access Token (`DISCOGS_PAT`)
- **User-Agent**: `MediumFormatAdmin/0.1 +https://mediumformat.info` (required)
- **Reads**: release metadata for catalog import (cached in `Release.rawJson`)
- **Writes**: marketplace listing CRUD
- **Webhook**: `/api/webhooks/discogs`
- **Rate limit**: 60 req/min authenticated → all writes go through the
  `channel-sync` queue

## Xendit (payments)

- **Auth**: `XENDIT_SECRET_KEY` (Basic auth, base64'd)
- **Webhook token**: `X-CALLBACK-TOKEN` header verified against
  `XENDIT_WEBHOOK_TOKEN` in `/api/webhooks/xendit`
- **Callback URL**: `https://mediumformat.info/api/webhooks/xendit`
- **Methods used**: QRIS, OVO, GoPay, ShopeePay, Virtual Account (BCA / Mandiri
  / BNI / BRI / Permata), Credit Card

## Biteship (shipping)

- **Auth**: `BITESHIP_API_KEY`
- **Used for**: courier rate quotes (`/v1/rates/couriers`), order creation,
  label PDF, AWB tracking
- **Webhook**: `/api/webhooks/biteship` — verified via
  `BITESHIP_WEBHOOK_TOKEN`

## Apple Music / iTunes

- **No key** — public Search API (`https://itunes.apple.com/search`)
- Used by the track preview resolver as the primary source (30-second
  previews available for most catalog tracks)

## YouTube Data v3

- **Auth**: `YOUTUBE_API_KEY`
- **Used for**: track preview fallback when Apple/Bandcamp miss
- Search by `"{artist} {track title}"`, take top result, save `videoId`

## Bandcamp

- **No API** — we embed the official iframe player by URL.
- If `Release.bandcampUrl` is set the resolver tries to find the matching
  track number on that album page.

## OpenRouter (AI)

- **Auth**: `OPENROUTER_API_KEY`
- **Default model**: `anthropic/claude-sonnet-4-6`
  (configurable via `OPENROUTER_DEFAULT_MODEL`)
- **Bulk model**: `openai/gpt-4o-mini`
  (configurable via `OPENROUTER_BULK_MODEL`)
- **Used for**: blurb suggestions in catalog editor, newsletter copy
  in `/admin/marketing`, ID ↔ EN translation

## Listmonk (newsletter)

- **Self-hosted** — separate container in `docker-compose.yml`
- **Admin**: `https://mail.mediumformat.info` (nginx proxies to listmonk:9000)
- **DB**: `listmonk-db` postgres container (separate from app DB)
- **Auth**: Basic auth to its admin API (`LISTMONK_USERNAME` / `LISTMONK_PASSWORD`)
- **Why self-hosted**: free, owns its subscriber list, plays well with
  Indonesian SMTP relays

## Tokopedia FS (MVP-3)

- **Auth**: OAuth client credentials (`TOKOPEDIA_FS_ID`, `TOKOPEDIA_CLIENT_ID`,
  `TOKOPEDIA_CLIENT_SECRET`)
- **Shop**: `TOKOPEDIA_SHOP_ID`
- **Webhook**: `/api/webhooks/tokopedia`

## Shopee Open API (MVP-4)

- **Auth**: HMAC-SHA256 with `SHOPEE_PARTNER_KEY`, `SHOPEE_PARTNER_ID`
- **Shop**: `SHOPEE_SHOP_ID`
- **Webhook**: `/api/webhooks/shopee`

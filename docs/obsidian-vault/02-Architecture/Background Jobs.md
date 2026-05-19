# Background Jobs

## Why a worker

Three reasons not to do these inline:

1. **External rate limits** — Discogs API is 60 req/min authenticated.
2. **Latency** — Apple Music Search + YouTube Data + Bandcamp embed lookups
   are slow and flaky; we don't want to block import.
3. **Bulk** — newsletter blast to 5k subscribers.

So we ship a separate **`worker`** container that drains BullMQ queues.

## Queues (`jobs/queues.ts`)

| Queue | Producer | Consumer | Notes |
|---|---|---|---|
| `discogs-sync` | Cron + admin actions | `pollDiscogsOrders` | Pulls new marketplace orders into our DB |
| `channel-sync` | Catalog edits, listing CRUD | `syncChannelListing` | Pushes a `ChannelListing` to the right marketplace |
| `track-resolve` | Release import / refresh | `resolveTracksForRelease` | Fills `Track.preview*` |
| `newsletter` | Marketing UI | (MVP-3) | Listmonk campaign send wrapper |
| `reconcile` | Cron | (TBD) | Stock vs ChannelListing reconciliation |

`bullConnection` (in `lib/redis.ts`) is the shared `ioredis` connection.

## Worker process

```bash
npm run worker         # local
docker compose up -d worker   # prod
```

In production it's a separate container in `docker-compose.yml` (same image
as `app`, but `command: ["npx","tsx","jobs/worker.ts"]`).

Workers register a `SIGTERM` handler so `docker compose down` drains
in-flight jobs.

## Handlers

### `resolve-tracks.ts`

Order: **Apple Music → Bandcamp → YouTube**, manual override always wins.
Writes `previewSource`, `previewUrl`, `previewExternalId`, `lastResolvedAt`.
Skips tracks where `previewLocked = true`.

### `sync-channel-listing.ts`

Dispatches based on `ChannelListing.channel.type`:

- `DISCOGS` → Marketplace listing PUT
- `TOKOPEDIA` → catalog upsert via FS API (MVP-3)
- `SHOPEE` → item update via Open API (MVP-4)
- `WEBSITE` / `POS` → no-op (these are us)

Writes `lastOutboundSyncAt` or `syncError`.

### `poll-discogs-orders.ts`

Pulls `marketplace/orders` since `Setting["discogs.last_order_poll"]`, upserts
into our `Order` table with `channelId = ch-discogs`, status mapped from
Discogs status, and deducts stock via a `StockMovement(reason=SALE)`.

## Logging

All handlers use `lib/logger.ts` (pino, pretty in dev, JSON in prod). Each job
log line includes `queue`, `jobId`, `name`.

## Failure handling

BullMQ retries with exponential backoff by default. On final failure the
`failed` event handler logs `err.message`; admin can re-enqueue from
`/admin/channels` (UI TODO).

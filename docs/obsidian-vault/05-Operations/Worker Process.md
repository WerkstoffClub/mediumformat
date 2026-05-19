# Worker Process

`jobs/worker.ts` — separate Node process, drains BullMQ queues.

## Local

```bash
npm run worker
```

Logs (pino, pretty in dev) stream to stdout.

## Production

```bash
docker compose up -d worker
docker compose logs --tail=200 -f worker
```

Same image as `app`, command overridden to `npx tsx jobs/worker.ts`.

## Queues it consumes

- `track-resolve` → `resolveTracksForRelease`
- `channel-sync` → `syncChannelListing`
- `discogs-sync` → `pollDiscogsOrders` (when `job.name === "poll-orders"`)

See [[02-Architecture/Background Jobs]] for the full table.

## Scaling

Single worker container today. To run more workers:

```yaml
worker:
  deploy:
    replicas: 3
```

BullMQ already partitions jobs across consumers — no code change needed.

## Graceful shutdown

`SIGTERM` triggers `worker.close()` on each Worker, which lets in-flight
jobs finish before exit. `docker compose down` and the container runtime's
stop signal both produce SIGTERM, so rolling deploys don't lose work.

## Failure inspection

BullMQ keeps failed jobs in Redis. To inspect / retry:

```bash
docker compose exec redis redis-cli
> KEYS "bull:*:failed"
> ZRANGE bull:track-resolve:failed 0 -1 WITHSCORES
```

Or use [`bull-board`](https://github.com/felixmosh/bull-board) (TBD — not
wired yet).

# Logging & Monitoring

## Logging

`lib/logger.ts` — pino.

- **Dev**: pretty-printed via `pino-pretty`.
- **Prod**: JSON to stdout — Docker captures it.

Tail in production:

```bash
docker compose logs --tail=500 -f app
docker compose logs --tail=500 -f worker
docker compose logs --tail=500 -f nginx
```

Pipe to `jq` for filtering:

```bash
docker compose logs --tail=1000 app | jq 'select(.level >= 40)'
```

## Health checks

- **postgres** — `pg_isready` (healthcheck in compose, used by depends_on)
- **nginx** — `curl -fs https://mediumformat.info/health` (TBD: ship a route)

Cloudflare also pings the apex at intervals (no config) — surfaced on the
Cloudflare dashboard.

## Metrics (not yet wired)

The path forward:

- pino-formatted logs → Vector → Loki → Grafana
- BullMQ → bull-board for queue stats
- Prometheus node-exporter on the VPS

For now, monitoring is **email alerts from external uptime pings** (uptimerobot.com)
and `docker compose logs` for forensics.

## Sentry (TODO)

Hook `@sentry/nextjs` into app + worker. Hold off until we have real traffic.

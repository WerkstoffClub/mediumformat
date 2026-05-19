# Production Topology

## Hosts & domains

| Domain | Resolves to | Purpose |
|---|---|---|
| `mediumformat.info` (apex) | Cloudflare proxy → `31.97.220.192` | Public site + admin |
| `www.mediumformat.info` | Cloudflare proxy → `31.97.220.192` | redirects to apex |
| `mail.mediumformat.info` | DNS only → `31.97.220.192` | Listmonk admin (grey cloud for LE renewal) |
| `vps.rocketsystem.cloud` | `31.97.220.192` | SSH-only hostname (registrar) |

> The DNS apex / www records are **proxied** (orange cloud) so Cloudflare can
> handle TLS at the edge, cache static assets, and apply WAF.
> The `mail` record is **DNS only** so Let's Encrypt's HTTP-01 challenge can
> reach our origin directly.

## Container layout

`docker-compose.yml` defines:

| Service | Image | Notes |
|---|---|---|
| `app` | built from `Dockerfile` | Next.js, exposes `:3000` internally |
| `worker` | same image, alt command | `npx tsx jobs/worker.ts` |
| `postgres` | `postgres:16-alpine` | volume `pgdata` |
| `redis` | `redis:7-alpine` | `--appendonly yes`, volume `redisdata` |
| `listmonk-db` | `postgres:16-alpine` | separate DB, volume `listmonkdata` |
| `listmonk` | `listmonk/listmonk:latest` | exposes `:9000` internally |
| `nginx` | `nginx:alpine` | binds host `:80` + `:443`, TLS terminator |
| `certbot` | `certbot/certbot:latest` | renew loop, 12h interval |

Volumes:

- `pgdata`, `redisdata`, `listmonkdata` — DB state
- `uploads` — `/app/public/uploads` (shared between `app` and `worker`)
- `certbot-www`, `certbot-certs` — ACME challenge + cert storage

## Traffic flow

```
Browser ──HTTPS──► Cloudflare edge ──HTTPS──► nginx (443)
                                                │
                          ┌─────────────────────┼─────────────────────┐
                          ▼                     ▼                     ▼
                   app:3000 (Next.js)    listmonk:9000           certbot
                          │                                       (sidecar)
                          ├──► postgres:5432
                          └──► redis:6379 ◄──── worker (BullMQ)
```

## Why nginx in front of Next.js even though Cloudflare also terminates

- **Listmonk** at `mail.mediumformat.info` needs a real cert at the origin
  (the `mail` DNS record is grey-cloud, so the connection bypasses Cloudflare).
- **HSTS / security headers** added in one place we control.
- **WebSocket upgrade** for any future realtime endpoints.
- **Predictable** — `docker compose up` brings the whole stack including TLS.

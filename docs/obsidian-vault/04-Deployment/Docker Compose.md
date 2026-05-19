# Docker Compose

Single `docker-compose.yml` at repo root, used in both staging and production.

## Services

```yaml
app:                # Next.js — exposes :3000 internally only
worker:             # `npx tsx jobs/worker.ts` — same image as app
postgres:           # postgres:16-alpine, healthchecked
redis:              # redis:7-alpine, appendonly yes
listmonk-db:        # postgres:16-alpine (separate DB)
listmonk:           # listmonk/listmonk:latest, :9000 internal
nginx:              # nginx:alpine, binds host :80 + :443
certbot:            # certbot/certbot:latest, 12h renew loop
```

The `app` and `worker` containers share the **same image** (built from the
repo `Dockerfile`) and the same `.env` file. Only the command differs.

## Volumes

| Volume | Mounted at | Purpose |
|---|---|---|
| `pgdata` | `postgres:/var/lib/postgresql/data` | app DB |
| `redisdata` | `redis:/data` | redis AOF |
| `listmonkdata` | `listmonk-db:/var/lib/postgresql/data` | listmonk DB |
| `uploads` | `app & worker:/app/public/uploads` | user-uploaded images |
| `certbot-www` | `nginx & certbot:/var/www/certbot` | ACME challenge |
| `certbot-certs` | `nginx & certbot:/etc/letsencrypt` | issued certs |

## Image build (Dockerfile)

Multi-stage:

1. **deps** — `npm ci --no-audit --no-fund` on `node:22-alpine` + `libc6-compat`, `openssl`.
2. **builder** — `npx prisma generate && npm run build`.
3. **runner** — `node:22-alpine` + `tini` (PID 1), runs as non-root `app` user,
   exposes `:3000`, `CMD ["npm","start"]`.

The `worker` container reuses the same image, overrides `CMD` to
`npx tsx jobs/worker.ts`.

## `.dockerignore`

Includes `node_modules`, `.next`, `.git`, `.env*`, build artifacts — keeps the
build context small.

## Bringing it up

```bash
docker compose up -d --build              # first time or after code change
docker compose run --rm app \
  npx prisma migrate deploy               # apply migrations
docker compose run --rm app npm run db:seed   # idempotent seed
```

## Bringing it down

```bash
docker compose down                       # stop + remove containers; volumes kept
docker compose down -v                    # stop + remove volumes (⚠️ data loss)
```

## Logs

```bash
docker compose logs --tail=200 -f app
docker compose logs --tail=200 -f worker
docker compose logs --tail=200 -f nginx
```

## Routine ops

```bash
docker compose ps                         # health
docker compose exec postgres psql -U mediumformat
docker compose exec app sh                # shell into app container
docker compose exec app npx prisma studio --port 5555
docker compose restart app worker
```

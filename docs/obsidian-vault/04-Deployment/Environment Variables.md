# Environment Variables

`cp .env.example .env` on the VPS and fill these in.

## Required for boot

| Var | Notes |
|---|---|
| `NODE_ENV` | `production` |
| `APP_URL` | `https://mediumformat.info` |
| `PUBLIC_APP_URL` | `https://mediumformat.info` |
| `DATABASE_URL` | `postgresql://mediumformat:${POSTGRES_PASSWORD}@postgres:5432/mediumformat?schema=public` |
| `REDIS_URL` | `redis://redis:6379` |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `https://mediumformat.info` |
| `POSTGRES_PASSWORD` | strong random — interpolated by compose into `postgres` service |
| `LISTMONK_DB_PASSWORD` | strong random — for `listmonk-db` |

## Seed (first boot only)

| Var | Notes |
|---|---|
| `SEED_ADMIN_EMAIL` | default `admin@mediumformat.info` |
| `SEED_ADMIN_NAME` | default `Medium Format Admin` |
| `SEED_ADMIN_PASSWORD` | empty → auto-generated + printed once |
| `SEED_DEFAULT_LOCATION_NAME` | default `Toko Medium Format` |

## Integrations

### Discogs

| Var | Notes |
|---|---|
| `DISCOGS_PAT` | PAT from https://www.discogs.com/settings/developers |
| `DISCOGS_USERNAME` | the shop's Discogs username |
| `DISCOGS_USER_AGENT` | `MediumFormatAdmin/0.1 +https://mediumformat.info` (required) |
| `DISCOGS_MARKETPLACE_CURRENCY` | `IDR` |

### Xendit

| Var | Notes |
|---|---|
| `XENDIT_SECRET_KEY` | live secret |
| `XENDIT_WEBHOOK_TOKEN` | from Xendit dashboard → Settings → Callbacks |
| `XENDIT_CALLBACK_URL` | `https://mediumformat.info/api/webhooks/xendit` |

### Biteship

| Var | Notes |
|---|---|
| `BITESHIP_API_KEY` | |
| `BITESHIP_WEBHOOK_TOKEN` | |

### YouTube

| Var | Notes |
|---|---|
| `YOUTUBE_API_KEY` | Data API v3 key |

### OpenRouter

| Var | Notes |
|---|---|
| `OPENROUTER_API_KEY` | |
| `OPENROUTER_DEFAULT_MODEL` | `anthropic/claude-sonnet-4-6` |
| `OPENROUTER_BULK_MODEL` | `openai/gpt-4o-mini` |

### Listmonk

| Var | Notes |
|---|---|
| `LISTMONK_BASE_URL` | `http://listmonk:9000` (inside docker network) |
| `LISTMONK_USERNAME` | `admin` |
| `LISTMONK_PASSWORD` | strong random |

### Tokopedia (MVP-3) — leave empty until ready

`TOKOPEDIA_FS_ID`, `TOKOPEDIA_CLIENT_ID`, `TOKOPEDIA_CLIENT_SECRET`, `TOKOPEDIA_SHOP_ID`

### Shopee (MVP-4) — leave empty until ready

`SHOPEE_PARTNER_ID`, `SHOPEE_PARTNER_KEY`, `SHOPEE_SHOP_ID`

## Uploads

| Var | Notes |
|---|---|
| `UPLOAD_DIR` | default `./public/uploads` |
| `MAX_UPLOAD_MB` | default `10` |

## Sanity check

```bash
# On the VPS, after editing .env:
docker compose config --no-interpolate | grep -Ei 'unset|missing'    # nothing
docker compose run --rm app node -e \
  "['DATABASE_URL','REDIS_URL','AUTH_SECRET','AUTH_URL'].forEach(k=>{if(!process.env[k]){console.error('missing',k);process.exit(1)}})"
```

# Medium Format

Admin dashboard + website for Medium Format, an independent record shop in
Jakarta, Indonesia. Sells across **website**, **POS** (in-store), **Discogs
Marketplace**, **Tokopedia**, and **Shopee**.

Inspired by common-ground.io, adapted for Indonesia.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind v4
- PostgreSQL 16 + Prisma 5
- Auth.js v5 (Credentials, JWT sessions)
- BullMQ + Redis for background jobs (Discogs sync, marketplace sync, track preview resolution, newsletter)
- Xendit (payments) · Biteship (shipping) · Listmonk (newsletter) · OpenRouter (AI assist)
- Docker Compose deploy on a self-managed VPS, behind nginx + Let's Encrypt

## Local development

```bash
cp .env.example .env
# fill DATABASE_URL, REDIS_URL, AUTH_SECRET, SEED_ADMIN_PASSWORD
# (Prisma CLI reads .env; Next.js reads both .env and .env.local)
npm install
npx prisma migrate deploy   # or `migrate dev` if you're iterating on schema.prisma
npm run db:seed             # creates admin user + default channels + sample news
npm run dev                 # http://localhost:8000
npm run worker              # in a second terminal
```

Postgres 16 + Redis 7 need to be running first — either via your OS package
manager (`pg_ctlcluster 16 main start`, `redis-server --daemonize yes`) or via
the included `docker-compose.yml` (`docker compose up -d postgres redis`).
The default `DATABASE_URL` expects a `mediumformat` role + database; create
them with `createuser -P mediumformat && createdb -O mediumformat mediumformat`.

Sign in at `/admin/login` with the email + password printed by the seed.

## Routes

- `/` `/shop` `/releases/[slug]` `/news` `/news/[slug]` `/cart` `/checkout` `/account` `/wholesale` — public site
- `/admin/dashboard` `/admin/catalog` `/admin/inventory` `/admin/pos` `/admin/orders` `/admin/customers` `/admin/messages` `/admin/marketing` `/admin/news` `/admin/channels` `/admin/reports` `/admin/settings`
- `/api/webhooks/{xendit,biteship,discogs,tokopedia,shopee}`

## Roles

`ADMIN` · `STAFF` · `SHOPKEEPER` · `WHOLESALER` · `CUSTOMER` — capability matrix in `lib/permissions.ts`.

## Phases

1. **MVP-1** auth + catalog (Discogs metadata) + inventory + manual orders + website + cart + Xendit + news + track previews
2. **MVP-2** POS + barcode + label print + Discogs marketplace selling + customer accounts + wantlist + messages
3. **MVP-3** Tokopedia + newsletter (Listmonk + OpenRouter) + reports
4. **MVP-4** Shopee + wholesale role/pricing + advanced reports

## Deployment

See `DEPLOYMENT.md` for VPS + Cloudflare DNS setup. Production runs as
docker-compose with `app`, `worker`, `postgres`, `redis`, `listmonk`,
`listmonk-db`, `nginx`, and `certbot`.

## Track previews

Each release's tracks render a play button (juno.co.uk style). Resolution order
on import: Apple Music → Bandcamp embed → YouTube. Manual override always wins.
See `jobs/handlers/resolve-tracks.ts`.

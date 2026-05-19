# Local Development

## Prerequisites

- Node 22+
- Docker (for Postgres + Redis — or run them natively)
- An editor with TypeScript support

## First run

```bash
git clone https://github.com/werkstoffclub/mediumformat.git
cd mediumformat
cp .env.example .env.local
```

Set at minimum:

```ini
DATABASE_URL=postgresql://mediumformat:mediumformat@localhost:5432/mediumformat?schema=public
REDIS_URL=redis://localhost:6379
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=http://localhost:8000
APP_URL=http://localhost:8000
```

Bring up Postgres + Redis (cheapest path: borrow the compose file):

```bash
docker compose up -d postgres redis
```

Install + migrate + seed:

```bash
npm install
npx prisma migrate dev          # creates schema + dev migration
npm run db:seed                 # creates admin user + locations + channels + news
```

## Running

Two terminals:

```bash
npm run dev         # http://localhost:8000
npm run worker      # BullMQ worker
```

The dev server runs on **port 8000** — pinned in `package.json` (`next dev -p 8000`)
so it doesn't collide with other Next.js projects on 3000.

## Useful commands

```bash
npm run lint                        # eslint
npx prisma studio                   # GUI at http://localhost:5555
npx prisma migrate dev --name foo   # create a new migration
npm run prisma:generate             # regenerate client after schema change
```

## Sign in

`http://localhost:8000/admin/login` — credentials from `prisma/seed.ts`
output (or whatever `SEED_ADMIN_PASSWORD` you set).

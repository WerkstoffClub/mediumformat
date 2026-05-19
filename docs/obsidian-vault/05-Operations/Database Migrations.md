# Database Migrations

## Authoring

```bash
# 1. edit prisma/schema.prisma
# 2. generate a migration:
npx prisma migrate dev --name add_foo_to_bar
# 3. commit prisma/migrations/<timestamp>_add_foo_to_bar/ AND schema.prisma
```

`migrate dev` does three things locally:

1. Diff `schema.prisma` against the dev DB
2. Write a SQL migration file
3. Apply it + regenerate the Prisma client

## Applying in production

```bash
ssh deploy@port.rocketsystem.cloud
cd /opt/mediumformat
git pull
docker compose run --rm app npx prisma migrate deploy
```

`migrate deploy` is the **production-safe** variant — it never modifies
`schema.prisma`, only applies pending migration files in order.

## Editing migrations

Once a migration is checked in and applied somewhere, treat it as immutable.
Edit by writing a **new** migration that undoes/redoes.

## Working with data changes

For data backfills, prefer a **separate one-off script** that you run
explicitly, not a migration. Migrations should be schema-only when possible —
they run once per environment without observability.

## Resetting locally (dev only)

```bash
npx prisma migrate reset   # drops DB, re-runs all migrations, re-runs seed
```

Never run this in production.

## Inspecting

```bash
npx prisma studio                 # local dev UI
docker compose exec postgres psql -U mediumformat
```

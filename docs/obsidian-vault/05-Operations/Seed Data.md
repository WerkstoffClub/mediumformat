# Seed Data

`prisma/seed.ts`, idempotent — safe to re-run.

## What it creates

| Entity | Rows |
|---|---|
| `User` (ADMIN) | 1, from `SEED_ADMIN_EMAIL` |
| `Location` | `loc-store-default` (STORE, default) + `loc-warehouse-default` (WAREHOUSE) |
| `Channel` | 5: `ch-website`, `ch-pos`, `ch-discogs`, `ch-tokopedia` (off), `ch-shopee` (off) |
| `Setting` | `tax.ppn_rate=0.11`, `discogs.marketplace_currency=IDR`, `store.name`, `store.address`, `store.currency`, `store.locale_default` |
| `NewsPost` | 1 sample post |

## Admin password

If `SEED_ADMIN_PASSWORD` is unset, `seed.ts` generates a 12-byte base64url
password, hashes it, and prints it to stdout **once**:

```
Admin user admin@mediumformat.info created.
Generated password: 4Hf7p9KqM2vN
Save this now — it won't be shown again.
```

Capture it from `docker compose run --rm app npm run db:seed` output.

## Running

Local:
```bash
npm run db:seed
```

Production:
```bash
docker compose run --rm app npm run db:seed
```

## What it doesn't create

Sample releases / products / variants / stock. That's intentional — we don't
want test data on a real shop's DB. Import real catalog through `/admin/catalog`.

# Backups

## What we back up

- **Postgres** (`mediumformat` DB) — orders, catalog, customers, everything.
- **Uploads** volume — product photos, news hero images.
- *(Optional)* **listmonk DB** — subscribers + campaigns.

Redis is **not** backed up — it's a cache + queue. Worst case we re-enqueue
stuck jobs.

## `scripts/backup.sh`

Run nightly at 03:00 UTC via cron. What it does:

```bash
docker exec mediumformat-postgres-1 pg_dump -U mediumformat mediumformat \
  | gzip > /var/backups/mediumformat/mf-{ISO}.sql.gz

# Keep last 7 dumps locally
ls -1t /var/backups/mediumformat/mf-*.sql.gz | tail -n +8 | xargs -r rm --

# Push newest off-site via rclone (if configured)
rclone copy "$OUT_DIR/mf-$STAMP.sql.gz" r2:mediumformat-backups/
```

Installed via:

```bash
sudo cp scripts/backup.sh /usr/local/bin/mf-backup.sh
sudo chmod +x /usr/local/bin/mf-backup.sh
echo "0 3 * * * /usr/local/bin/mf-backup.sh" | sudo tee /etc/cron.d/mediumformat-backup
```

## Cloudflare R2 off-site

R2 is S3-compatible and cheap. To set up:

1. Cloudflare → R2 → Create bucket `mediumformat-backups` in **AP-East** (Singapore).
2. Create an API token with `Object Read/Write` scoped to that bucket.
3. On the VPS:

```bash
sudo apt install -y rclone
rclone config
# n) new remote
# name> r2
# Storage> s3
# provider> Cloudflare
# access_key_id> <R2 access key>
# secret_access_key> <R2 secret key>
# endpoint> https://<account>.r2.cloudflarestorage.com
```

`rclone copy "…/mf-$STAMP.sql.gz" r2:mediumformat-backups/` will work after that.

## Restore

```bash
# Stop the app first to prevent writes:
docker compose stop app worker

# Recreate a clean DB:
docker compose exec postgres dropdb -U mediumformat mediumformat
docker compose exec postgres createdb -U mediumformat mediumformat

# Restore:
gunzip -c /var/backups/mediumformat/mf-2026-05-18T03-00-00Z.sql.gz \
  | docker compose exec -T postgres psql -U mediumformat mediumformat

# Apply any new migrations:
docker compose run --rm app npx prisma migrate deploy

# Bring everything back:
docker compose start app worker
```

## What's NOT backed up yet (TODO)

- Uploads volume — needs an `rsync` to R2 leg in `backup.sh`.
- Listmonk DB — separate script if newsletter list grows valuable.

#!/usr/bin/env bash
# Nightly Postgres backup. Run via cron on the VPS:
#   0 3 * * * /opt/mediumformat/scripts/backup.sh
#
# Stores last 7 daily dumps locally, then uploads the newest to R2.
# Requires `rclone` configured with a remote named "r2".

set -euo pipefail

STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
OUT_DIR="/var/backups/mediumformat"
mkdir -p "$OUT_DIR"

docker exec mediumformat-postgres-1 pg_dump -U mediumformat mediumformat \
  | gzip > "$OUT_DIR/mf-$STAMP.sql.gz"

# Prune > 7 daily dumps
ls -1t "$OUT_DIR"/mf-*.sql.gz | tail -n +8 | xargs -r rm --

# Upload latest off-site
if command -v rclone >/dev/null 2>&1; then
  rclone copy "$OUT_DIR/mf-$STAMP.sql.gz" r2:mediumformat-backups/
fi

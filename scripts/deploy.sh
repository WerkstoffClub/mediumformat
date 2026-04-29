#!/usr/bin/env bash
# Pull, rebuild, migrate, restart.
# Run on the VPS as the deploy user:
#   /opt/mediumformat/scripts/deploy.sh

set -euo pipefail
cd /opt/mediumformat

git fetch --all --prune
git checkout main
git pull --ff-only

docker compose build app worker
docker compose run --rm app npx prisma migrate deploy
docker compose up -d

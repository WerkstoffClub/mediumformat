#!/usr/bin/env bash
# Subsequent deploy: pull repo, pull image (or build if pull fails),
# run migrations, restart services.
#
# Run on the VPS as the deploy user:
#   /opt/mediumformat/scripts/deploy.sh

set -euo pipefail
cd /opt/mediumformat

git fetch --all --prune
git checkout main
git pull --ff-only

# Prefer the image built by the GitHub Actions workflow.
# Fall back to a local build if the pull fails (no registry creds, GHA
# hasn't built this commit yet, network blip, etc).
if ! docker compose pull app worker; then
  echo "[deploy] pull failed, building locally"
  docker compose build app worker
fi

docker compose run --rm app npx prisma migrate deploy
docker compose up -d

#!/usr/bin/env bash
# ==========================================================================
# Medium Format — deploy the REAL app (NestJS API + back-office SPA) to the
# VPS stack, alongside the static prototype.
#
#   mediumformat.info/            → static prototype   (sync.sh)
#   mediumformat.info/backoffice/ → React back-office  (this script)
#   mediumformat.info/api/v1/…    → NestJS API         (this script)
#
# What it does:
#   1. Builds the back-office locally with --base=/backoffice/
#   2. Rsyncs the API build context (workspace subset) to ${STACK_DIR}/app-src
#   3. Rsyncs the back-office dist to ${STACK_DIR}/site/backoffice
#   4. Ships docker-compose.yml + Caddyfile
#   5. Creates ${STACK_DIR}/api.env on first run (generated secrets; DealPOS
#      creds + feed token copied from the local root .env)
#   6. docker compose up -d --build, then seeds the admin user
#
# Usage:  ./deploy/docker/deploy-app.sh
# ==========================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [ -f deploy/docker/stack.env ]; then
  set -a; . deploy/docker/stack.env; set +a
else
  echo "ERROR: deploy/docker/stack.env not found." >&2; exit 1
fi
: "${SSH_HOST:?}"; : "${SSH_USER:?}"; : "${SSH_PORT:=22}"; : "${STACK_DIR:=/opt/stacks/mediumformat}"
SSH=(ssh -p "$SSH_PORT" "${SSH_USER}@${SSH_HOST}")

echo ">> [1/6] Building back-office (base=/backoffice/)"
pnpm --filter @mf/backoffice exec vite build --base=/backoffice/ >/dev/null

echo ">> [2/6] Syncing API build context -> ${STACK_DIR}/app-src"
"${SSH[@]}" "mkdir -p '${STACK_DIR}/app-src/packages' '${STACK_DIR}/app-src/apps' '${STACK_DIR}/site/backoffice'"
RS=(rsync -az --delete -e "ssh -p ${SSH_PORT}")
"${RS[@]}" package.json pnpm-lock.yaml pnpm-workspace.yaml deploy/docker/Dockerfile.api \
  "${SSH_USER}@${SSH_HOST}:${STACK_DIR}/app-src/"
"${RS[@]}" --exclude node_modules --exclude dist packages/shared \
  "${SSH_USER}@${SSH_HOST}:${STACK_DIR}/app-src/packages/"
"${RS[@]}" --exclude node_modules --exclude dist --exclude .env apps/api \
  "${SSH_USER}@${SSH_HOST}:${STACK_DIR}/app-src/apps/"

echo ">> [3/6] Syncing back-office dist -> ${STACK_DIR}/site/backoffice"
"${RS[@]}" apps/backoffice/dist/ "${SSH_USER}@${SSH_HOST}:${STACK_DIR}/site/backoffice/"

echo ">> [4/6] Shipping compose + Caddyfile"
"${RS[@]}" deploy/docker/docker-compose.yml deploy/docker/Caddyfile \
  "${SSH_USER}@${SSH_HOST}:${STACK_DIR}/"

echo ">> [5/6] Ensuring ${STACK_DIR}/api.env"
DEALPOS_SUBDOMAIN=$(grep -o 'DEALPOS_SUBDOMAIN="[^"]*"' .env | cut -d'"' -f2)
DEALPOS_CLIENT_ID=$(grep -o 'DEALPOS_CLIENT_ID="[^"]*"' .env | cut -d'"' -f2)
DEALPOS_CLIENT_SECRET=$(grep -o 'DEALPOS_CLIENT_SECRET="[^"]*"' .env | cut -d'"' -f2)
SOCIAL_FEED_TOKEN=$(grep -o 'SOCIAL_FEED_TOKEN="[^"]*"' .env | cut -d'"' -f2)
"${SSH[@]}" "STACK_DIR='${STACK_DIR}' \
  DP_SUB='${DEALPOS_SUBDOMAIN}' DP_ID='${DEALPOS_CLIENT_ID}' DP_SECRET='${DEALPOS_CLIENT_SECRET}' FEED_TOKEN='${SOCIAL_FEED_TOKEN}' \
  bash -s" <<'REMOTE'
set -euo pipefail
ENVF="${STACK_DIR}/api.env"
if [ ! -f "$ENVF" ]; then
  PGPASS=$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32)
  JWT1=$(head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 48)
  JWT2=$(head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 48)
  cat > "$ENVF" <<EOF
POSTGRES_DB=mediumformat
POSTGRES_USER=mf
POSTGRES_PASSWORD=${PGPASS}
DATABASE_URL=postgresql://mf:${PGPASS}@db:5432/mediumformat
JWT_SECRET=${JWT1}
JWT_REFRESH_SECRET=${JWT2}
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://mediumformat.info
DEALPOS_SUBDOMAIN=${DP_SUB}
DEALPOS_CLIENT_ID=${DP_ID}
DEALPOS_CLIENT_SECRET=${DP_SECRET}
SOCIAL_FEED_TOKEN=${FEED_TOKEN}
EOF
  chmod 600 "$ENVF"
  echo "   created api.env (new secrets generated)"
else
  echo "   api.env exists — left untouched"
fi
REMOTE

echo ">> [6/6] docker compose up -d --build (first build takes a few minutes)"
"${SSH[@]}" "cd '${STACK_DIR}' && docker compose up -d --build && docker compose ps --format 'table {{.Name}}\t{{.Status}}'"

echo ">> Seeding admin user (idempotent)"
"${SSH[@]}" "docker exec mediumformat-api npx prisma db seed" || echo "   (seed skipped/failed — check manually)"

echo ">> Done. Verify: https://mediumformat.info/backoffice/  and  https://mediumformat.info/api/v1/auth/login"

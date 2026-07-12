#!/usr/bin/env bash
# ==========================================================================
# Medium Format — push the static site + Caddyfile to the VPS stack folder.
#
# The Portainer stack (docker-compose.yml) bind-mounts:
#     ${STACK_DIR}/site       -> /srv           (the web root)
#     ${STACK_DIR}/Caddyfile  -> /etc/caddy/Caddyfile
# This script rsyncs both up. Caddy serves changes live — no rebuild needed.
#
# Usage:  ./deploy/docker/sync.sh          (real sync)
#         DRY=1 ./deploy/docker/sync.sh    (preview, no writes)
#
# First-time setup and the Portainer stack steps are in README.md.
# ==========================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# --- Load config ---
if [ -f deploy/docker/stack.env ]; then
  set -a; . deploy/docker/stack.env; set +a
else
  echo "ERROR: deploy/docker/stack.env not found. Copy stack.env.example and fill it in." >&2
  exit 1
fi
: "${SSH_HOST:?}"; : "${SSH_USER:?}"; : "${SSH_PORT:=22}"; : "${STACK_DIR:=/opt/stacks/mediumformat}"

# --- What ships (the web root). Everything else stays out. ---
INCLUDES=(
  index.html preview.html 404.html favicon.svg robots.txt sitemap.xml site.webmanifest
  "mockup-*.html"
  design-system
  assets
)

DRYFLAG=""
[ "${DRY:-0}" = "1" ] && DRYFLAG="--dry-run" && echo ">> DRY RUN (no files written)"

echo ">> Target: ${SSH_USER}@${SSH_HOST}:${STACK_DIR}"
ssh -p "$SSH_PORT" "${SSH_USER}@${SSH_HOST}" "mkdir -p '${STACK_DIR}/site'"

# Stage the exact web-root set so --delete only prunes within site/.
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
for item in "${INCLUDES[@]}"; do
  # shellcheck disable=SC2086
  cp -R $item "$STAGE"/ 2>/dev/null || true
done

echo ">> Syncing web root -> ${STACK_DIR}/site"
# protect backoffice/ and shop/ — they're deployed by deploy-app.sh, not staged here
rsync -avz $DRYFLAG --delete --exclude=".DS_Store" \
  --filter="protect backoffice/" --filter="protect shop/" \
  -e "ssh -p ${SSH_PORT}" \
  "$STAGE"/ \
  "${SSH_USER}@${SSH_HOST}:${STACK_DIR}/site/"

echo ">> Syncing Caddyfile -> ${STACK_DIR}/Caddyfile"
rsync -avz $DRYFLAG \
  -e "ssh -p ${SSH_PORT}" \
  deploy/docker/Caddyfile \
  "${SSH_USER}@${SSH_HOST}:${STACK_DIR}/Caddyfile"

echo ">> Done. If the Caddyfile changed, restart the stack in Portainer"
echo "   (or: docker exec mediumformat-web caddy reload --config /etc/caddy/Caddyfile)"
echo ">> https://mediumformat.info/"

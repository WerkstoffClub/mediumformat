#!/usr/bin/env bash
# ==========================================================================
# Medium Format — one-command production deploy (behind Traefik on the VPS).
#
# Does the whole thing: pushes the web root + Caddyfile + compose to
# ${STACK_DIR} on the VPS, brings the stack up, and smoke-tests HTTPS.
# Idempotent — safe to re-run for every release.
#
# Setup once:  cp stack.env.example stack.env  (fill in SSH details)
#              # key-based SSH assumed; add your key with: ssh-copy-id <user>@<host>
# Usage:       ./deploy/docker/deploy.sh
#              DRY=1 ./deploy/docker/deploy.sh   (preview file sync, skip up + test)
#
# For content-only updates (no compose/label change) sync.sh is enough and faster.
# ==========================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
HERE="deploy/docker"

# --- Config ---
if [ -f "$HERE/stack.env" ]; then
  set -a; . "$HERE/stack.env"; set +a
else
  echo "ERROR: $HERE/stack.env not found. Copy stack.env.example and fill it in." >&2
  exit 1
fi
: "${SSH_HOST:?}"; : "${SSH_USER:?}"; : "${SSH_PORT:=22}"; : "${STACK_DIR:=/opt/stacks/mediumformat}"
DOMAIN="${DOMAIN:-mediumformat.info}"
SSH="ssh -p ${SSH_PORT} ${SSH_USER}@${SSH_HOST}"
RSH="ssh -p ${SSH_PORT}"

# --- Web root allowlist (keep in sync with sync.sh) ---
INCLUDES=(
  index.html 404.html favicon.svg robots.txt sitemap.xml site.webmanifest
  "mockup-*.html"
  design-system
)

DRYFLAG=""
[ "${DRY:-0}" = "1" ] && DRYFLAG="--dry-run" && echo ">> DRY RUN (sync preview only; no up/test)"

echo ">> Target: ${SSH_USER}@${SSH_HOST}:${STACK_DIR}"
$SSH "mkdir -p '${STACK_DIR}/site'"

# --- Stage the exact web-root set, then mirror it (--delete prunes only site/) ---
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
for item in "${INCLUDES[@]}"; do
  # shellcheck disable=SC2086
  cp -R $item "$STAGE"/ 2>/dev/null || true
done

echo ">> Syncing site -> ${STACK_DIR}/site"
rsync -az $DRYFLAG --delete -e "$RSH" "$STAGE"/ "${SSH_USER}@${SSH_HOST}:${STACK_DIR}/site/"

echo ">> Pushing Caddyfile + docker-compose.yml"
rsync -az $DRYFLAG -e "$RSH" "$HERE/Caddyfile"           "${SSH_USER}@${SSH_HOST}:${STACK_DIR}/Caddyfile"
rsync -az $DRYFLAG -e "$RSH" "$HERE/docker-compose.yml"  "${SSH_USER}@${SSH_HOST}:${STACK_DIR}/docker-compose.yml"

if [ "${DRY:-0}" = "1" ]; then
  echo ">> DRY RUN done (stack not touched)."
  exit 0
fi

echo ">> Bringing the stack up"
$SSH "cd '${STACK_DIR}' && docker compose up -d"
$SSH "docker exec mediumformat-web caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true"

echo ">> Smoke test https://${DOMAIN}/"
code="$(curl -sS -o /dev/null -w '%{http_code}' "https://${DOMAIN}/" || echo 000)"
if [ "$code" = "200" ]; then
  echo ">> OK — https://${DOMAIN}/ returned 200"
else
  echo ">> WARN — https://${DOMAIN}/ returned ${code} (check DNS / Traefik / logs: docker logs mediumformat-web)" >&2
  exit 1
fi
echo ">> Deployed."
